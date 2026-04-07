import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'county.displayTime';
        this.statusBarItem.tooltip = 'County — Click to see project time details';
    }

    update(timeString: string, enabled: boolean, projectName: string) {
        const icon = enabled ? '$(clock)' : '$(debug-pause)';
        this.statusBarItem.text = `${icon} ${timeString}`;
        this.statusBarItem.tooltip = `County: ${projectName} — ${timeString}${enabled ? '' : ' (paused)'}`;
        this.statusBarItem.show();
    }

    hide() {
        this.statusBarItem.hide();
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}
