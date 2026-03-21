use rusqlite::{Connection, params};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Returns the path to the database file: %APPDATA%/EisenLabel/data.db
fn db_path() -> PathBuf {
    let app_dir = dirs::data_dir()
        .expect("Could not find AppData directory")
        .join("EisenLabel");
    fs::create_dir_all(&app_dir).expect("Could not create EisenLabel data dir");
    app_dir.join("data.db")
}

/// Application database state, held behind a Mutex for thread-safe Tauri command access.
pub struct AppDb {
    pub conn: Mutex<Connection>,
}

impl AppDb {
    pub fn init() -> Self {
        let path = db_path();
        let conn = Connection::open(&path)
            .unwrap_or_else(|e| panic!("Failed to open database at {}: {}", path.display(), e));

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .expect("Failed to set PRAGMAs");

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS templates (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                label_width_mm  REAL NOT NULL,
                label_height_mm REAL NOT NULL,
                logo_enabled    INTEGER NOT NULL DEFAULT 0,
                fields          TEXT NOT NULL DEFAULT '[]',
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                name                TEXT NOT NULL,
                source_template_id  INTEGER NOT NULL DEFAULT 0,
                fields              TEXT NOT NULL DEFAULT '[]',
                label_width_mm      REAL NOT NULL,
                label_height_mm     REAL NOT NULL,
                logo_enabled        INTEGER NOT NULL DEFAULT 0,
                page_size           TEXT NOT NULL DEFAULT 'A4',
                page_width_mm       REAL NOT NULL DEFAULT 210,
                page_height_mm      REAL NOT NULL DEFAULT 297,
                page_orientation    TEXT NOT NULL DEFAULT 'portrait',
                created_at          TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS labels (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id          INTEGER NOT NULL,
                field_values    TEXT NOT NULL DEFAULT '{}',
                shape_preset    TEXT,
                shape_segments  TEXT NOT NULL DEFAULT '[]',
                copies          INTEGER NOT NULL DEFAULT 1,
                sort_order      INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL DEFAULT ''
            );"
        ).expect("Failed to create tables");

        // Migrations: add columns that may not exist in older databases
        conn.execute("ALTER TABLE jobs ADD COLUMN client_name TEXT NOT NULL DEFAULT ''", []).ok();
        conn.execute("ALTER TABLE jobs ADD COLUMN notes TEXT NOT NULL DEFAULT ''", []).ok();

        // Restore missing columns from reconstruction script failure
        conn.execute("ALTER TABLE templates ADD COLUMN sizing_mode TEXT NOT NULL DEFAULT 'grid'", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN columns INTEGER NOT NULL DEFAULT 2", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN rows INTEGER NOT NULL DEFAULT 5", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN phone_enabled INTEGER NOT NULL DEFAULT 0", []).ok();
        
        // Add template page config columns
        conn.execute("ALTER TABLE templates ADD COLUMN page_size TEXT NOT NULL DEFAULT 'A4'", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN page_width_mm REAL NOT NULL DEFAULT 210", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN page_height_mm REAL NOT NULL DEFAULT 297", []).ok();
        conn.execute("ALTER TABLE templates ADD COLUMN page_orientation TEXT NOT NULL DEFAULT 'portrait'", []).ok();

        conn.execute("ALTER TABLE jobs ADD COLUMN sizing_mode TEXT NOT NULL DEFAULT 'grid'", []).ok();
        conn.execute("ALTER TABLE jobs ADD COLUMN columns INTEGER NOT NULL DEFAULT 2", []).ok();
        conn.execute("ALTER TABLE jobs ADD COLUMN rows INTEGER NOT NULL DEFAULT 5", []).ok();
        conn.execute("ALTER TABLE jobs ADD COLUMN phone_enabled INTEGER NOT NULL DEFAULT 0", []).ok();
        conn.execute("ALTER TABLE jobs ADD COLUMN job_field_values TEXT NOT NULL DEFAULT '{}'", []).ok();

        // Print layout columns for templates and jobs
        for table in ["templates", "jobs"] {
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN margin_top_mm REAL NOT NULL DEFAULT 0", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN margin_bottom_mm REAL NOT NULL DEFAULT 0", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN margin_left_mm REAL NOT NULL DEFAULT 0", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN margin_right_mm REAL NOT NULL DEFAULT 0", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN label_gap_mm REAL NOT NULL DEFAULT 0", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN printer_margin_mm REAL NOT NULL DEFAULT 4.5", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN length_unit TEXT NOT NULL DEFAULT 'mm'", table), []).ok();
            conn.execute(&format!("ALTER TABLE {} ADD COLUMN field_padding_mm REAL NOT NULL DEFAULT 6", table), []).ok();
        }

        // Insert default settings if they don't exist
        let defaults = vec![
            ("logo_image_path", ""),
            ("default_page_size", "A4"),
            ("default_template_id", ""),
            ("company_name", ""),
            ("margin_top_mm", "10"),
            ("margin_bottom_mm", "10"),
            ("margin_left_mm", "10"),
            ("margin_right_mm", "10"),
            ("label_gap_mm", "2"),
        ];
        for (key, value) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
                params![key, value],
            ).expect("Failed to insert default setting");
        }

        // Migrate label shape_segments from absolute angles to CNC bend angles
        let migrated: String = conn.query_row(
            "SELECT value FROM settings WHERE key = 'angles_convention'", [],
            |r| r.get(0)
        ).unwrap_or_default();
        if migrated != "relative" {
            let mut stmt = conn.prepare("SELECT id, shape_segments FROM labels").unwrap();
            let rows: Vec<(i64, String)> = stmt.query_map([], |r| {
                Ok((r.get(0)?, r.get(1)?))
            }).unwrap().filter_map(|r| r.ok()).collect();

            for (id, json) in rows {
                if let Ok(segs) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
                    let mut prev_angle = 0.0f64;
                    let converted: Vec<serde_json::Value> = segs.iter().map(|s| {
                        let abs = s["angle"].as_f64().unwrap_or(0.0);
                        let rel = abs - prev_angle;
                        prev_angle = abs;
                        serde_json::json!({"length": s["length"], "angle": rel})
                    }).collect();
                    if let Ok(new_json) = serde_json::to_string(&converted) {
                        conn.execute(
                            "UPDATE labels SET shape_segments = ?1 WHERE id = ?2",
                            params![new_json, id]
                        ).ok();
                    }
                }
            }
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('angles_convention', 'relative')",
                []
            ).ok();
        }

        AppDb { conn: Mutex::new(conn) }
    }
}
