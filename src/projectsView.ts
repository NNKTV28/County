import * as vscode from 'vscode';
import type { TimeTracker, NativeModule, ProjectInfo } from './types';

export class ProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private changeEmitter = new vscode.EventEmitter<ProjectItem | undefined>();
    readonly onDidChangeTreeData = this.changeEmitter.event;

    constructor(
        private tracker: TimeTracker,
        private native: NativeModule
    ) {}

    refresh() {
        this.changeEmitter.fire(undefined);
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectItem): ProjectItem[] {
        if (element) {
            return [];
        }

        const projects = this.tracker.getTopProjects(50);
        const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        return projects.map((project, index) => {
            const isCurrent = project.path === currentPath;
            return new ProjectItem(project, index + 1, isCurrent, this.native);
        });
    }
}

class ProjectItem extends vscode.TreeItem {
    constructor(
        project: ProjectInfo,
        rank: number,
        isCurrent: boolean,
        native: NativeModule
    ) {
        const timeStr = native.formatDuration(project.totalSeconds);
        const label = `${rank}. ${project.name}`;

        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = timeStr;
        this.tooltip = `${project.name}\n${project.path}\n${timeStr}${project.enabled ? '' : ' (paused)'}`;
        this.contextValue = project.enabled ? 'project-enabled' : 'project-disabled';

        if (isCurrent) {
            this.iconPath = new vscode.ThemeIcon('arrow-right');
        } else if (!project.enabled) {
            this.iconPath = new vscode.ThemeIcon('debug-pause');
        } else {
            this.iconPath = new vscode.ThemeIcon('clock');
        }
    }
}
