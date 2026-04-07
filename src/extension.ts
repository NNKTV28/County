import * as vscode from 'vscode';
import * as path from 'node:path';
import { registerCommands } from './commands';
import { StatusBarManager } from './statusBar';
import { ProjectsProvider } from './projectsView';
import type { TimeTracker, NativeModule } from './types';

let native: NativeModule;
let tracker: TimeTracker;
let statusBarManager: StatusBarManager;
let projectsProvider: ProjectsProvider;
let tickInterval: NodeJS.Timeout | undefined;
let saveInterval: NodeJS.Timeout | undefined;
let lastActivityTime = Date.now();
let tickCount = 0;

export function activate(context: vscode.ExtensionContext) {
    try {
        native = require('../native/index');
    } catch {
        vscode.window.showErrorMessage(
            'County: Native module not found. Build it first:\n' +
            'cd native && npm install && npx napi build --platform --release'
        );
        return;
    }

    const storagePath = path.join(context.globalStorageUri.fsPath, 'county-data.json');
    tracker = new native.TimeTracker(storagePath);

    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    projectsProvider = new ProjectsProvider(tracker, native);
    const treeView = vscode.window.createTreeView('county.projectsView', {
        treeDataProvider: projectsProvider,
    });
    context.subscriptions.push(treeView);
    context.subscriptions.push(
        vscode.commands.registerCommand('county.refreshProjects', () => projectsProvider.refresh())
    );

    registerActivityListeners(context);
    registerCommands(context, tracker, native);
    startTimers(context);
    updateStatusBar();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('county')) {
                restartTimers(context);
                updateStatusBar();
            }
        })
    );
}

function registerActivityListeners(context: vscode.ExtensionContext) {
    const onActivity = () => {
        lastActivityTime = Date.now();
    };

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(onActivity),
        vscode.window.onDidChangeActiveTextEditor(onActivity),
        vscode.workspace.onDidChangeTextDocument(onActivity),
        vscode.window.onDidChangeWindowState(state => {
            if (state.focused) {
                onActivity();
            }
        })
    );
}

function startTimers(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('county');
    const saveIntervalMs = config.get<number>('saveIntervalSeconds', 30) * 1000;

    tickInterval = setInterval(tick, 1000);
    saveInterval = setInterval(() => tracker.save(), saveIntervalMs);

    context.subscriptions.push(
        { dispose: () => stopTimers() }
    );
}

function restartTimers(context: vscode.ExtensionContext) {
    stopTimers();
    const config = vscode.workspace.getConfiguration('county');
    const saveIntervalMs = config.get<number>('saveIntervalSeconds', 30) * 1000;

    tickInterval = setInterval(tick, 1000);
    saveInterval = setInterval(() => tracker.save(), saveIntervalMs);
}

function stopTimers() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = undefined;
    }
    if (saveInterval) {
        clearInterval(saveInterval);
        saveInterval = undefined;
    }
}

function tick() {
    const projectPath = getProjectPath();
    if (!projectPath) {
        return;
    }

    const config = vscode.workspace.getConfiguration('county');
    const idleTimeoutMs = config.get<number>('idleTimeoutSeconds', 300) * 1000;

    const isIdle = (Date.now() - lastActivityTime) > idleTimeoutMs;
    if (isIdle || !tracker.isEnabled(projectPath)) {
        return;
    }

    tracker.addTime(projectPath, getProjectName(), 1, new Date().toISOString());
    updateStatusBar();

    tickCount++;
    if (tickCount % 60 === 0) {
        projectsProvider.refresh();
    }
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('county');
    if (!config.get<boolean>('showStatusBar', true)) {
        statusBarManager.hide();
        return;
    }

    const projectPath = getProjectPath();
    if (!projectPath) {
        statusBarManager.hide();
        return;
    }

    const project = tracker.getProject(projectPath);
    const enabled = tracker.isEnabled(projectPath);
    const totalSeconds = project?.totalSeconds ?? 0;
    const timeStr = native.formatDurationShort(totalSeconds);
    const name = project?.name ?? getProjectName();

    statusBarManager.update(timeStr, enabled, name);
}

function getProjectPath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getProjectName(): string {
    return vscode.workspace.workspaceFolders?.[0]?.name ?? 'Unknown';
}

export function deactivate() {
    stopTimers();
    tracker?.save();
}
