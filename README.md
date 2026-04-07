<div align="center">

# ⏱️ County

**Track time spent on every project you open in VS Code — powered by Rust.**

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![Rust](https://img.shields.io/badge/Engine-Rust-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Features

| | Feature | Description |
|---|---|---|
| ⏱️ | **Auto Tracking** | Timer starts automatically when you open a project |
| 📊 | **Project Rankings** | See your top projects sorted by total time |
| 🔘 | **Per-Project Toggle** | Enable/disable tracking per project |
| 💤 | **Idle Detection** | Pauses when you step away — no phantom time |
| 📌 | **Status Bar** | Always-visible elapsed time in the bottom bar |
| 🗂️ | **Sidebar Panel** | Dedicated activity bar icon with project list |
| 💾 | **Persistent Storage** | Data survives across sessions and restarts |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type:

| Command | What it does |
|---|---|
| `County: Display Time` | Shows current project time + ranked project list |
| `County: Show Settings` | Opens County settings |
| `County: Toggle Timer` | Enable/disable timer for any tracked project |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `county.idleTimeoutSeconds` | `300` | Seconds of inactivity before the timer pauses |
| `county.saveIntervalSeconds` | `30` | How often data is persisted to disk |
| `county.showStatusBar` | `true` | Show/hide the status bar timer |

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) toolchain
- [Node.js](https://nodejs.org/) >= 18

### Build

```bash
# Install dependencies
npm install
cd native && npm install && cd ..

# Build everything (Rust + TypeScript)
npm run build
```

### Run in Development

Press **F5** in VS Code — it launches an Extension Development Host with County loaded.

### Package for Distribution

```bash
npm run package
# Produces county-0.1.0.vsix
code --install-extension county-0.1.0.vsix
```

> **Note:** The `.vsix` contains a platform-specific native binary. Build on each target OS for cross-platform support.

---

## Architecture

```
County/
├── native/                  Rust core (napi-rs)
│   ├── Cargo.toml
│   ├── build.rs
│   └── src/lib.rs           Storage, stats, duration formatting
│
├── src/                     TypeScript extension
│   ├── extension.ts         Lifecycle, timers, idle detection
│   ├── commands.ts          Command palette handlers
│   ├── statusBar.ts         Status bar widget
│   ├── projectsView.ts     Sidebar tree view
│   └── types.ts             Shared type definitions
│
├── media/                   Icons
│   ├── icon.svg             Activity bar icon
│   └── marketplace-icon.png Marketplace listing icon
│
├── package.json             Extension manifest
└── tsconfig.json
```

| Layer | Responsibility |
|---|---|
| **Rust** | JSON persistence, project data, time formatting, rankings |
| **TypeScript** | VS Code API, timer intervals, idle detection, UI components |

---

## License

MIT
