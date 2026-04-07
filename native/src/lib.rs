#![deny(clippy::all)]

use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone)]
struct ProjectRecord {
    #[serde(default)]
    name: String,
    #[serde(default)]
    path: String,
    #[serde(default)]
    total_seconds: u64,
    #[serde(default)]
    last_active: String,
    #[serde(default = "default_true")]
    enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct Store {
    #[serde(default)]
    projects: HashMap<String, ProjectRecord>,
}

#[napi(object)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub total_seconds: u32,
    pub last_active: String,
    pub enabled: bool,
}

impl From<&ProjectRecord> for ProjectInfo {
    fn from(record: &ProjectRecord) -> Self {
        Self {
            name: record.name.clone(),
            path: record.path.clone(),
            total_seconds: record.total_seconds.min(u64::from(u32::MAX)) as u32,
            last_active: record.last_active.clone(),
            enabled: record.enabled,
        }
    }
}

#[napi]
pub struct TimeTracker {
    store: Store,
    storage_path: String,
}

#[napi]
impl TimeTracker {
    #[napi(constructor)]
    pub fn new(storage_path: String) -> Self {
        let store = load_store(&storage_path);
        Self { store, storage_path }
    }

    #[napi]
    pub fn save(&self) -> bool {
        save_store(&self.storage_path, &self.store)
    }

    #[napi]
    pub fn add_time(
        &mut self,
        project_path: String,
        project_name: String,
        seconds: u32,
        timestamp: String,
    ) {
        let entry = self
            .store
            .projects
            .entry(project_path.clone())
            .or_insert_with(|| ProjectRecord {
                name: project_name,
                path: project_path,
                total_seconds: 0,
                last_active: String::new(),
                enabled: true,
            });
        entry.total_seconds += u64::from(seconds);
        entry.last_active = timestamp;
    }

    #[napi]
    pub fn get_project(&self, project_path: String) -> Option<ProjectInfo> {
        self.store.projects.get(&project_path).map(ProjectInfo::from)
    }

    #[napi]
    pub fn get_top_projects(&self, limit: u32) -> Vec<ProjectInfo> {
        let mut projects: Vec<&ProjectRecord> = self.store.projects.values().collect();
        projects.sort_by(|a, b| b.total_seconds.cmp(&a.total_seconds));
        projects
            .into_iter()
            .take(limit as usize)
            .map(ProjectInfo::from)
            .collect()
    }

    #[napi]
    pub fn get_all_projects(&self) -> Vec<ProjectInfo> {
        self.store.projects.values().map(ProjectInfo::from).collect()
    }

    #[napi]
    pub fn set_enabled(&mut self, project_path: String, enabled: bool) -> bool {
        if let Some(project) = self.store.projects.get_mut(&project_path) {
            project.enabled = enabled;
            true
        } else {
            false
        }
    }

    #[napi]
    pub fn is_enabled(&self, project_path: String) -> bool {
        self.store
            .projects
            .get(&project_path)
            .map_or(true, |p| p.enabled)
    }

    #[napi]
    pub fn get_project_names(&self) -> Vec<String> {
        self.store
            .projects
            .values()
            .map(|p| format!("{} — {}", p.name, p.path))
            .collect()
    }
}

#[napi]
pub fn format_duration(total_seconds: u32) -> String {
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}

#[napi]
pub fn format_duration_short(total_seconds: u32) -> String {
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;

    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

fn load_store(path: &str) -> Store {
    let file_path = Path::new(path);
    if file_path.exists() {
        fs::read_to_string(file_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        Store::default()
    }
}

fn save_store(path: &str, store: &Store) -> bool {
    let file_path = Path::new(path);
    if let Some(parent) = file_path.parent() {
        if !parent.exists() && fs::create_dir_all(parent).is_err() {
            return false;
        }
    }
    serde_json::to_string_pretty(store)
        .ok()
        .map_or(false, |json| fs::write(file_path, json).is_ok())
}
