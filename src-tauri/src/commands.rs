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
        "sizing_mode": row.get::<_, String>(8).unwrap_or_else(|_| "grid".to_string()),
        "columns": row.get::<_, i32>(9).unwrap_or(2),
        "rows": row.get::<_, i32>(10).unwrap_or(5),
        "phone_enabled": row.get::<_, i32>(11).unwrap_or(0) != 0,
        "page_size": row.get::<_, String>(12).unwrap_or_else(|_| "A4".to_string()),
        "page_width_mm": row.get::<_, f64>(13).unwrap_or(210.0),
        "page_height_mm": row.get::<_, f64>(14).unwrap_or(297.0),
        "page_orientation": row.get::<_, String>(15).unwrap_or_else(|_| "portrait".to_string()),
        "margin_top_mm": row.get::<_, f64>(16).unwrap_or(0.0),
        "margin_bottom_mm": row.get::<_, f64>(17).unwrap_or(0.0),
        "margin_left_mm": row.get::<_, f64>(18).unwrap_or(0.0),
        "margin_right_mm": row.get::<_, f64>(19).unwrap_or(0.0),
        "label_gap_mm": row.get::<_, f64>(20).unwrap_or(0.0),
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
        "client_name": row.get::<_, String>(13)?,
        "notes": row.get::<_, String>(14)?,
        "sizing_mode": row.get::<_, String>(15).unwrap_or_else(|_| "grid".to_string()),
        "columns": row.get::<_, i32>(16).unwrap_or(2),
        "rows": row.get::<_, i32>(17).unwrap_or(5),
        "phone_enabled": row.get::<_, i32>(18).unwrap_or(0) != 0,
        "job_field_values": row.get::<_, String>(19).unwrap_or_else(|_| "{}".to_string()),
        "margin_top_mm": row.get::<_, f64>(20).unwrap_or(0.0),
        "margin_bottom_mm": row.get::<_, f64>(21).unwrap_or(0.0),
        "margin_left_mm": row.get::<_, f64>(22).unwrap_or(0.0),
        "margin_right_mm": row.get::<_, f64>(23).unwrap_or(0.0),
        "label_gap_mm": row.get::<_, f64>(24).unwrap_or(0.0),
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
        .prepare("SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at, sizing_mode, columns, rows, phone_enabled, page_size, page_width_mm, page_height_mm, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM templates ORDER BY updated_at DESC")
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
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at, sizing_mode, columns, rows, phone_enabled, page_size, page_width_mm, page_height_mm, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM templates WHERE id = ?1",
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
    sizing_mode: Option<String>,
    columns: Option<i32>,
    rows: Option<i32>,
    phone_enabled: Option<bool>,
    page_size: Option<String>,
    page_width_mm: Option<f64>,
    page_height_mm: Option<f64>,
    page_orientation: Option<String>,
    margin_top_mm: Option<f64>,
    margin_bottom_mm: Option<f64>,
    margin_left_mm: Option<f64>,
    margin_right_mm: Option<f64>,
    label_gap_mm: Option<f64>,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let sm = sizing_mode.unwrap_or_else(|| "grid".to_string());
    let cols = columns.unwrap_or(2);
    let rws = rows.unwrap_or(5);
    let pe = phone_enabled.unwrap_or(false) as i32;
    let ps = page_size.unwrap_or_else(|| "A4".to_string());
    let pw = page_width_mm.unwrap_or(210.0);
    let ph = page_height_mm.unwrap_or(297.0);
    let po = page_orientation.unwrap_or_else(|| "portrait".to_string());
    let mt = margin_top_mm.unwrap_or(0.0);
    let mb = margin_bottom_mm.unwrap_or(0.0);
    let ml = margin_left_mm.unwrap_or(0.0);
    let mr = margin_right_mm.unwrap_or(0.0);
    let gap = label_gap_mm.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO templates (name, label_width_mm, label_height_mm, logo_enabled, fields, sizing_mode, columns, rows, phone_enabled, page_size, page_width_mm, page_height_mm, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![name, label_width_mm, label_height_mm, logo_enabled as i32, fields, sm, cols, rws, pe, ps, pw, ph, po, mt, mb, ml, mr, gap],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at, sizing_mode, columns, rows, phone_enabled, page_size, page_width_mm, page_height_mm, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM templates WHERE id = ?1",
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
    sizing_mode: Option<String>,
    columns: Option<i32>,
    rows: Option<i32>,
    phone_enabled: Option<bool>,
    page_size: Option<String>,
    page_width_mm: Option<f64>,
    page_height_mm: Option<f64>,
    page_orientation: Option<String>,
    margin_top_mm: Option<f64>,
    margin_bottom_mm: Option<f64>,
    margin_left_mm: Option<f64>,
    margin_right_mm: Option<f64>,
    label_gap_mm: Option<f64>,
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
    if let Some(v) = sizing_mode { sets.push(format!("sizing_mode = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = columns { sets.push(format!("columns = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = rows { sets.push(format!("rows = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = phone_enabled { sets.push(format!("phone_enabled = ?{}", values.len() + 1)); values.push(Box::new(v as i32)); }
    if let Some(v) = page_size { sets.push(format!("page_size = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_width_mm { sets.push(format!("page_width_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_height_mm { sets.push(format!("page_height_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = page_orientation { sets.push(format!("page_orientation = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_top_mm { sets.push(format!("margin_top_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_bottom_mm { sets.push(format!("margin_bottom_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_left_mm { sets.push(format!("margin_left_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_right_mm { sets.push(format!("margin_right_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = label_gap_mm { sets.push(format!("label_gap_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }

    let id_param_idx = values.len() + 1;
    values.push(Box::new(id));

    let sql = format!("UPDATE templates SET {} WHERE id = ?{}", sets.join(", "), id_param_idx);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, label_width_mm, label_height_mm, logo_enabled, fields, created_at, updated_at, sizing_mode, columns, rows, phone_enabled, page_size, page_width_mm, page_height_mm, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM templates WHERE id = ?1",
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
        .prepare("SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at, client_name, notes, sizing_mode, columns, rows, phone_enabled, job_field_values, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM jobs ORDER BY updated_at DESC")
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
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at, client_name, notes, sizing_mode, columns, rows, phone_enabled, job_field_values, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM jobs WHERE id = ?1",
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
    client_name: Option<String>,
    notes: Option<String>,
    sizing_mode: Option<String>,
    columns: Option<i32>,
    rows: Option<i32>,
    phone_enabled: Option<bool>,
    job_field_values: Option<String>,
    margin_top_mm: Option<f64>,
    margin_bottom_mm: Option<f64>,
    margin_left_mm: Option<f64>,
    margin_right_mm: Option<f64>,
    label_gap_mm: Option<f64>,
) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let cn = client_name.unwrap_or_default();
    let nt = notes.unwrap_or_default();
    let sm = sizing_mode.unwrap_or_else(|| "grid".to_string());
    let cols = columns.unwrap_or(2);
    let rws = rows.unwrap_or(5);
    let pe = phone_enabled.unwrap_or(false) as i32;
    let jfv = job_field_values.unwrap_or_else(|| "{}".to_string());
    let mt = margin_top_mm.unwrap_or(0.0);
    let mb = margin_bottom_mm.unwrap_or(0.0);
    let ml = margin_left_mm.unwrap_or(0.0);
    let mr = margin_right_mm.unwrap_or(0.0);
    let gap = label_gap_mm.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO jobs (name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, client_name, notes, sizing_mode, columns, rows, phone_enabled, job_field_values, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        params![name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled as i32, page_size, page_width_mm, page_height_mm, page_orientation, cn, nt, sm, cols, rws, pe, jfv, mt, mb, ml, mr, gap],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at, client_name, notes, sizing_mode, columns, rows, phone_enabled, job_field_values, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM jobs WHERE id = ?1",
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
    client_name: Option<String>,
    notes: Option<String>,
    sizing_mode: Option<String>,
    columns: Option<i32>,
    rows: Option<i32>,
    phone_enabled: Option<bool>,
    job_field_values: Option<String>,
    margin_top_mm: Option<f64>,
    margin_bottom_mm: Option<f64>,
    margin_left_mm: Option<f64>,
    margin_right_mm: Option<f64>,
    label_gap_mm: Option<f64>,
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
    if let Some(v) = client_name { sets.push(format!("client_name = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = notes { sets.push(format!("notes = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = sizing_mode { sets.push(format!("sizing_mode = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = columns { sets.push(format!("columns = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = rows { sets.push(format!("rows = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = phone_enabled { sets.push(format!("phone_enabled = ?{}", values.len() + 1)); values.push(Box::new(v as i32)); }
    if let Some(v) = job_field_values { sets.push(format!("job_field_values = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_top_mm { sets.push(format!("margin_top_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_bottom_mm { sets.push(format!("margin_bottom_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_left_mm { sets.push(format!("margin_left_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = margin_right_mm { sets.push(format!("margin_right_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }
    if let Some(v) = label_gap_mm { sets.push(format!("label_gap_mm = ?{}", values.len() + 1)); values.push(Box::new(v)); }

    let id_param_idx = values.len() + 1;
    values.push(Box::new(id));

    let sql = format!("UPDATE jobs SET {} WHERE id = ?{}", sets.join(", "), id_param_idx);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, source_template_id, fields, label_width_mm, label_height_mm, logo_enabled, page_size, page_width_mm, page_height_mm, page_orientation, created_at, updated_at, client_name, notes, sizing_mode, columns, rows, phone_enabled, job_field_values, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm, label_gap_mm FROM jobs WHERE id = ?1",
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
