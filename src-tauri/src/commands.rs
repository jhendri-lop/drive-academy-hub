use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppPaths {
    pub app_data_dir: String,
    pub documents_dir: String,
    pub database_path: String,
    pub photos_dir: String,
    pub assets_dir: String,
}

#[tauri::command]
pub fn ensure_app_dirs() -> Result<AppPaths, String> {
    let app_data = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ZentriumphDriveOfice");

    let documents = dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ZentriumphDriveOfice");

    let photos = app_data.join("photos");
    let assets = app_data.join("assets");
    let db_path = app_data.join("database.db");

    fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
    fs::create_dir_all(&documents).map_err(|e| e.to_string())?;
    fs::create_dir_all(&photos).map_err(|e| e.to_string())?;
    fs::create_dir_all(&assets).map_err(|e| e.to_string())?;

    Ok(AppPaths {
        app_data_dir: app_data.to_string_lossy().to_string(),
        documents_dir: documents.to_string_lossy().to_string(),
        database_path: db_path.to_string_lossy().to_string(),
        photos_dir: photos.to_string_lossy().to_string(),
        assets_dir: assets.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn save_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let target = path.replace('/', "\\");
        let _ = std::fs::create_dir_all(&target);
        std::process::Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::fs::create_dir_all(&path);
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
