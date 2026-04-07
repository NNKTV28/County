import * as vscode from 'vscode';
import type { TimeTracker } from './types';

const GIST_FILENAME = 'county-sync.json';
const GIST_DESCRIPTION = 'County — VS Code Time Tracker Sync Data';

interface GistFile {
    filename: string;
    content: string;
}

interface Gist {
    id: string;
    description: string;
    files: Record<string, GistFile>;
}

export class GistSyncManager {
    private gistId: string | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private tracker: TimeTracker
    ) {
        this.gistId = context.globalState.get<string>('county.gistId');
    }

    async sync(): Promise<boolean> {
        const session = await this.getGitHubSession();
        if (!session) {
            return false;
        }

        const gist = await this.findOrCreateGist(session.accessToken);
        if (!gist) {
            return false;
        }

        const remoteContent = gist.files[GIST_FILENAME]?.content;
        if (remoteContent) {
            this.tracker.mergeJson(remoteContent);
        }

        const localData = this.tracker.exportJson();
        const updateSuccess = await this.updateGist(session.accessToken, gist.id, localData);

        if (updateSuccess) {
            this.tracker.save();
        }

        return updateSuccess;
    }

    private async getGitHubSession(): Promise<vscode.AuthenticationSession | undefined> {
        try {
            return await vscode.authentication.getSession('github', ['gist'], {
                createIfNone: true,
            });
        } catch {
            vscode.window.showErrorMessage('County: GitHub sign-in is required for sync.');
            return undefined;
        }
    }

    private async findOrCreateGist(token: string): Promise<Gist | undefined> {
        if (this.gistId) {
            const existing = await this.getGist(token, this.gistId);
            if (existing) {
                return existing;
            }
            this.gistId = undefined;
            await this.context.globalState.update('county.gistId', undefined);
        }

        const found = await this.searchGist(token);
        if (found) {
            this.gistId = found.id;
            await this.context.globalState.update('county.gistId', found.id);
            return found;
        }

        const created = await this.createGist(token);
        if (created) {
            this.gistId = created.id;
            await this.context.globalState.update('county.gistId', created.id);
        }
        return created;
    }

    private async getGist(token: string, gistId: string): Promise<Gist | undefined> {
        try {
            const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
                headers: buildHeaders(token),
            });
            if (!response.ok) {
                return undefined;
            }
            return (await response.json()) as Gist;
        } catch {
            return undefined;
        }
    }

    private async searchGist(token: string): Promise<Gist | undefined> {
        try {
            const response = await fetch('https://api.github.com/gists?per_page=100', {
                headers: buildHeaders(token),
            });
            if (!response.ok) {
                return undefined;
            }
            const gists = (await response.json()) as Gist[];
            return gists.find(
                (g) => g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME]
            );
        } catch {
            return undefined;
        }
    }

    private async createGist(token: string): Promise<Gist | undefined> {
        try {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: buildHeaders(token),
                body: JSON.stringify({
                    description: GIST_DESCRIPTION,
                    public: false,
                    files: {
                        [GIST_FILENAME]: { content: this.tracker.exportJson() },
                    },
                }),
            });
            if (!response.ok) {
                return undefined;
            }
            return (await response.json()) as Gist;
        } catch {
            return undefined;
        }
    }

    private async updateGist(token: string, gistId: string, content: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
                method: 'PATCH',
                headers: buildHeaders(token),
                body: JSON.stringify({
                    files: {
                        [GIST_FILENAME]: { content },
                    },
                }),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

function buildHeaders(token: string): Record<string, string> {
    return {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'County-VSCode-Extension',
    };
}
