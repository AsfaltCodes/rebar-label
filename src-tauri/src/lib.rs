mod db;
mod commands;

use db::AppDb;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppDb::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_templates,
            commands::get_template,
            commands::create_template,
            commands::update_template,
            commands::delete_template,
            commands::list_jobs,
            commands::get_job,
            commands::create_job,
            commands::update_job,
            commands::delete_job,
            commands::list_labels,
            commands::create_label,
            commands::update_label,
            commands::delete_label,
            commands::get_all_settings,
            commands::set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
