import * as vscode from 'vscode';
import type { TimeTracker, NativeModule, ProjectInfo } from './types';

export function registerCommands(
    context: vscode.ExtensionContext,
    tracker: TimeTracker,
    native: NativeModule
) {
    context.subscriptions.push(
        vscode.commands.registerCommand('county.displayTime', () =>
            displayTime(tracker, native)
        ),
        vscode.commands.registerCommand('county.showSettings', () =>
            showSettings()
        ),
        vscode.commands.registerCommand('county.toggleTimer', (projectPath?: string) =>
            toggleTimer(tracker, projectPath)
        )
    );
}

async function displayTime(tracker: TimeTracker, native: NativeModule) {
    const topProjects = tracker.getTopProjects(25);

    if (topProjects.length === 0) {
        vscode.window.showInformationMessage('County: No projects tracked yet.');
        return;
    }

    const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const items: vscode.QuickPickItem[] = topProjects.map(
        (project: ProjectInfo, index: number) => {
            const timeStr = native.formatDuration(project.totalSeconds);
            const isCurrent = project.path === currentPath;
            const status = project.enabled ? '' : ' (paused)';
            const prefix = isCurrent ? '$(arrow-right) ' : `#${index + 1}  `;

            return {
                label: `${prefix}${project.name}${status}`,
                description: timeStr,
                detail: project.path,
            };
        }
    );

    const currentProject = currentPath ? tracker.getProject(currentPath) : null;
    if (currentProject) {
        vscode.window.showInformationMessage(
            `County: ${currentProject.name} — ${native.formatDuration(currentProject.totalSeconds)}`
        );
    }

    await vscode.window.showQuickPick(items, {
        title: 'County — Project Time Rankings',
        placeHolder: 'Your tracked projects sorted by time spent',
    });
}

async function showSettings() {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'county');
}

async function toggleTimer(tracker: TimeTracker, directProjectPath?: string) {
    if (directProjectPath) {
        const wasEnabled = tracker.isEnabled(directProjectPath);
        tracker.setEnabled(directProjectPath, !wasEnabled);
        tracker.save();
        return;
    }

    const allProjects = tracker.getAllProjects();
    const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (allProjects.length === 0 && !currentPath) {
        vscode.window.showInformationMessage('County: No projects tracked yet.');
        return;
    }

    interface ToggleItem extends vscode.QuickPickItem {
        projectPath: string;
    }

    const items: ToggleItem[] = [];

    if (currentPath) {
        const currentName = vscode.workspace.workspaceFolders![0].name;
        const currentEnabled = tracker.isEnabled(currentPath);
        items.push({
            label: `$(arrow-right) ${currentName}`,
            description: currentEnabled ? '$(debug-pause) Disable' : '$(play) Enable',
            detail: `Current project — Timer is ${currentEnabled ? 'enabled' : 'disabled'}`,
            projectPath: currentPath,
        });
    }

    for (const project of allProjects) {
        if (project.path === currentPath) {
            continue;
        }
        items.push({
            label: project.name,
            description: project.enabled ? '$(debug-pause) Disable' : '$(play) Enable',
            detail: `${project.path} — Timer is ${project.enabled ? 'enabled' : 'disabled'}`,
            projectPath: project.path,
        });
    }

    const selection = await vscode.window.showQuickPick(items, {
        title: 'County — Toggle Timer',
        placeHolder: 'Select a project to enable/disable its timer',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (!selection) {
        return;
    }

    const isCurrentlyEnabled = tracker.isEnabled(selection.projectPath);
    tracker.setEnabled(selection.projectPath, !isCurrentlyEnabled);
    tracker.save();

    const projectLabel = selection.label.replace('$(arrow-right) ', '');
    const newState = !isCurrentlyEnabled ? 'enabled' : 'disabled';
    vscode.window.showInformationMessage(`County: Timer ${newState} for ${projectLabel}`);
}
