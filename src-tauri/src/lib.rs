pub mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ensure_app_dirs,
            save_binary_file,
            read_binary_file,
            file_exists,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
