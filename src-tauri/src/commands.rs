use crate::db::AppDb;
use rusqlite::params;
use serde_json::{json, Value};
use tauri::State;

// ─── Helpers ───────────────────────────────────────────────────

fn row_to_template(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "name": row.get::<_, String>(1)?,
        "label_width_mm": row.get::<_, f64>(2)?,
        "label_height_mm": row.get::<_, f64>(3)?,
        "logo_enabled": row.get::<_, i32>(4)? != 0,
        "fields": row.get::<_, String>(5)?,
        "created_at": row.get::<_, String>(6)?,
        "updated_at": row.get::<_, String>(7)?,
    }))
}

fn row_to_job(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "name": row.get::<_, String>(1)?,
        "source_template_id": row.get::<_, i64>(2)?,
        "fields": row.get::<_, String>(3)?,
        "label_width_mm": row.get::<_, f64>(4)?,
        "label_height_mm": row.get::<_, f64>(5)?,
        "logo_enabled": row.get::<_, i32>(6)? != 0,
        "page_size": row.get::<_, String>(7)?,
        "page_width_mm": row.get::<_, f64>(8)?,
        "page_height_mm": row.get::<_, f64>(9)?,
        "page_orientation": row.get::<_, String>(10)?,
        "created_at": row.get::<_, String>(11)?,
        "updated_at": row.get::<_, String>(12)?,
    }))
}

fn row_to_label(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "job_id": row.get::<_, i64>(1)?,
        "field_values": row.get::<_, String>(2)?,
        "shape_preset": row.get::<_, Option<String>>(3)?,
        "shape_segments": row.get::<_, String>(4)?,
        "copies": row.get::<_, i32>(5)?,
        "sort_order": row.get::<_, i32>(6)?,
    }))
}

// ─── Templates ─────────────────────────────────────────────────

#[tauri::command]
pub fn list_templates(db: State<AppDb>) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at FROM templates ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row_to_template(row))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_template(db: State<AppDb>, id: i64) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at FROM templates WHERE id = ?1",
        params![id],
        |row| row_to_template(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_template(
    db: State<AppDb>,
    name: String,
    label_width_mm: f64,
    label_height_mm: f64,
    logo_enabled: bool,
    fields: String,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO templates (name, label_width_mm, label_height_mm, logo_enabled, fields) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name, label_width_mm, label_height_mm, logo_enabled as i32, fields],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at FROM templates WHERE id = ?1",
        params![id],
        |row| row_to_template(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_template(
    db: State<AppDb>,
    id: i64,
    name: Option<String>,
    label_width_mm: Option<f64>,
    label_height_mm: Option<f64>,
    logo_enabled: Option<bool>,
    fields: Option<String>,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    // Build dynamic SET clause
    let mut sets: Vec<String> = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = name { sets.push(format!("name = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = label_width_mm { sets.push(format!("label_width_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = label_height_mm { sets.push(format!("label_height_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = logo_enabled { sets.push(format!("logo_enabled = ?{}", values.len() + 1)); values.push(Box::new(v as i32)); }
    if let Some(v) = fields { sets.push(format!("fields = ?{}", values.len() + 1)); values.push(Box::new(v)); }

    let id_param_idx = values.len() + 1;
    values.push(Box::new(id));

    let sql = format!("UPDATE templates SET {} WHERE id = ?{}", sets.join(", "), id_param_idx);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at FROM templates WHERE id = ?1",
        params![id],
        |row| row_to_template(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_template(db: State<AppDb>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM templates WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Jobs ──────────────────────────────────────────────────────

#[tauri::command]
pub fn list_jobs(db: State<AppDb>) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at FROM jobs ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row_to_job(row))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_job(db: State<AppDb>, id: i64) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at FROM jobs WHERE id = ?1",
        params![id],
        |row| row_to_job(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_job(
    db: State<AppDb>,
    name: String,
    source_template_id: i64,
    fields: String,
    label_width_mm: f64,
    label_height_mm: f64,
    logo_enabled: bool,
    page_size: String,
    page_width_mm: f64,
    page_height_mm: f64,
    page_orientation: String,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO jobs (name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled as i32, page_size, page_width_mm, page_height_mm, page_orientation],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at FROM jobs WHERE id = ?1",
        params![id],
        |row| row_to_job(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_job(
    db: State<AppDb>,
    id: i64,
    name: Option<String>,
    fields: Option<String>,
    page_size: Option<String>,
    page_width_mm: Option<f64>,
    page_height_mm: Option<f64>,
    page_orientation: Option<String>,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = name { sets.push(format!("name = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = fields { sets.push(format!("fields = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_size { sets.push(format!("page_size = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_width_mm { sets.push(format!("page_width_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_height_mm { sets.push(format!("page_height_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_orientation { sets.push(format!("page_orientation = ?{}", values.len() + 1)); values.push(Box::new(v)); }

    let id_param_idx = values.len() + 1;
    values.push(Box::new(id));

    let sql = format!("UPDATE jobs SET {} WHERE id = ?{}", sets.join(", "), id_param_idx);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at FROM jobs WHERE id = ?1",
        params![id],
        |row| row_to_job(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_job(db: State<AppDb>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    // Labels are cascade-deleted via FK
    conn.execute("DELETE FROM jobs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Labels ────────────────────────────────────────────────────

#[tauri::command]
pub fn list_labels(db: State<AppDb>, job_id: i64) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, job_id, field_values, shape_preset, shape_segments, copies, sort_order FROM labels WHERE job_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![job_id], |row| row_to_label(row))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_label(
    db: State<AppDb>,
    job_id: i64,
    field_values: String,
    shape_preset: Option<String>,
    shape_segments: String,
    copies: i32,
    sort_order: i32,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO labels (job_id, field_values, shape_preset, shape_segments, copies, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![job_id, field_values, shape_preset, shape_segments, copies, sort_order],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, job_id, field_values, shape_preset, shape_segments, copies, sort_order FROM labels WHERE id = ?1",
        params![id],
        |row| row_to_label(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_label(
    db: State<AppDb>,
    id: i64,
    field_values: Option<String>,
    shape_preset: Option<String>,
    shape_segments: Option<String>,
    copies: Option<i32>,
    sort_order: Option<i32>,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = field_values { sets.push(format!("field_values = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = shape_preset { sets.push(format!("shape_preset = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = shape_segments { sets.push(format!("shape_segments = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = copies { sets.push(format!("copies = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = sort_order { sets.push(format!("sort_order = ?{}", values.len() + 1)); values.push(Box::new(v)); }

    if !sets.is_empty() {
        let id_param_idx = values.len() + 1;
        values.push(Box::new(id));
        let sql = format!("UPDATE labels SET {} WHERE id = ?{}", sets.join(", "), id_param_idx);
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|b| b.as_ref()).collect();
        conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    }

    conn.query_row(
        "SELECT id, job_id, field_values, shape_preset, shape_segments, copies, sort_order FROM labels WHERE id = ?1",
        params![id],
        |row| row_to_label(row),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_label(db: State<AppDb>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM labels WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Settings ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_all_settings(db: State<AppDb>) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut map = serde_json::Map::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        map.insert(k, Value::String(v));
    }
    Ok(Value::Object(map))
}

#[tauri::command]
pub fn set_setting(db: State<AppDb>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
