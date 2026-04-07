export interface ProjectInfo {
    name: string;
    path: string;
    totalSeconds: number;
    lastActive: string;
    enabled: boolean;
}

export interface TimeTracker {
    save(): boolean;
    addTime(projectPath: string, projectName: string, seconds: number, timestamp: string): void;
    getProject(projectPath: string): ProjectInfo | null;
    getTopProjects(limit: number): ProjectInfo[];
    getAllProjects(): ProjectInfo[];
    setEnabled(projectPath: string, enabled: boolean): boolean;
    isEnabled(projectPath: string): boolean;
    getProjectNames(): string[];
    exportJson(): string;
    mergeJson(remoteJson: string): boolean;
}

export interface NativeModule {
    TimeTracker: new (storagePath: string) => TimeTracker;
    formatDuration(totalSeconds: number): string;
    formatDurationShort(totalSeconds: number): string;
}
