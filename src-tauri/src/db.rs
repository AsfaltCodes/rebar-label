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

        AppDb { conn: Mutex::new(conn) }
    }
}
