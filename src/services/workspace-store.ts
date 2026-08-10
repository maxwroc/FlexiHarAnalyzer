import { IHarFile } from "../types/har-file";
import { IParserSnapshot, IRequestViewPreferences, IWorkspaceRecord, IWorkspaceSummary } from "../types/workspace";

const databaseName = "flexi_har_analyzer";
const workspaceStoreName = "workspaces";
const summaryStoreName = "workspace_summaries";
const sessionStoreName = "session";
const metadataStoreName = "metadata";
const sessionDataId = "data";
const sessionPreferencesId = "preferences";
const workspaceLockName = "flexi-har-workspace-write";
const workspaceEpochId = "epoch";

interface ISessionDataRecord {
    id: typeof sessionDataId;
    revision: string;
    har: IHarFile;
    parsers: IParserSnapshot[];
}

interface ISessionPreferencesRecord {
    id: typeof sessionPreferencesId;
    revision: string;
    preferences: IRequestViewPreferences;
}

export class WorkspaceStore {
    async saveLastSession(revision: string, har: IHarFile, parsers: IParserSnapshot[], preferences: IRequestViewPreferences, expectedEpoch?: string): Promise<void> {
        await this.withWriteLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction(sessionStoreName, "readwrite");
                const store = transaction.objectStore(sessionStoreName);
                store.put({ id: sessionDataId, revision, har, parsers });
                store.put({ id: sessionPreferencesId, revision, preferences });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        }, expectedEpoch);
    }

    async saveLastSessionPreferences(revision: string, preferences: IRequestViewPreferences, expectedEpoch?: string): Promise<void> {
        await this.withWriteLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction(sessionStoreName, "readwrite");
                const store = transaction.objectStore(sessionStoreName);
                const dataRequest = store.get(sessionDataId);
                dataRequest.onsuccess = () => {
                    const data = dataRequest.result as ISessionDataRecord | undefined;
                    if (data?.revision === revision) store.put({ id: sessionPreferencesId, revision, preferences });
                };
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        }, expectedEpoch);
    }

    async loadLastSession(): Promise<IWorkspaceRecord | undefined> {
        const database = await this.open();
        const transaction = database.transaction(sessionStoreName, "readonly");
        const store = transaction.objectStore(sessionStoreName);
        const [data, preferences] = await Promise.all([
            this.request<ISessionDataRecord | undefined>(store.get(sessionDataId)),
            this.request<ISessionPreferencesRecord | undefined>(store.get(sessionPreferencesId)),
        ]);
        database.close();
        if (!data || !preferences || data.revision !== preferences.revision) return undefined;
        return {
            id: "__last_session__",
            name: "Last session",
            updatedAt: "",
            har: data.har,
            parsers: data.parsers,
            preferences: preferences.preferences,
            sessionRevision: data.revision,
        };
    }

    async clearLastSession(): Promise<void> {
        await this.withWriteLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction(sessionStoreName, "readwrite");
                const store = transaction.objectStore(sessionStoreName);
                store.delete(sessionDataId);
                store.delete(sessionPreferencesId);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        });
    }

    async saveNamedWorkspace(name: string, workspace: Omit<IWorkspaceRecord, "id" | "name" | "updatedAt">, id?: string): Promise<IWorkspaceRecord> {
        const record: IWorkspaceRecord = {
            ...workspace,
            id: id || crypto.randomUUID(),
            name: name.trim(),
            updatedAt: new Date().toISOString(),
        };
        const summary: IWorkspaceSummary = { id: record.id, name: record.name, updatedAt: record.updatedAt };
        await this.withWriteLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction([workspaceStoreName, summaryStoreName], "readwrite");
                transaction.objectStore(workspaceStoreName).put(record);
                transaction.objectStore(summaryStoreName).put(summary);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        });
        return record;
    }

    async loadWorkspace(id: string): Promise<IWorkspaceRecord | undefined> {
        const database = await this.open();
        const record = await this.request<IWorkspaceRecord | undefined>(database.transaction(workspaceStoreName, "readonly").objectStore(workspaceStoreName).get(id));
        database.close();
        return record;
    }

    async listWorkspaces(): Promise<IWorkspaceSummary[]> {
        const database = await this.open();
        const records = await this.request<IWorkspaceSummary[]>(database.transaction(summaryStoreName, "readonly").objectStore(summaryStoreName).getAll());
        database.close();
        return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    async deleteWorkspace(id: string): Promise<void> {
        await this.withWriteLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction([workspaceStoreName, summaryStoreName], "readwrite");
                transaction.objectStore(workspaceStoreName).delete(id);
                transaction.objectStore(summaryStoreName).delete(id);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        });
    }

    async clearAll(): Promise<void> {
        await this.withLock(async () => {
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction([workspaceStoreName, summaryStoreName, sessionStoreName, metadataStoreName], "readwrite");
                transaction.objectStore(workspaceStoreName).clear();
                transaction.objectStore(summaryStoreName).clear();
                transaction.objectStore(sessionStoreName).clear();
                transaction.objectStore(metadataStoreName).put({ id: workspaceEpochId, value: crypto.randomUUID() });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
        });
    }

    private request<T>(request: IDBRequest): Promise<T> {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => reject(request.error);
        });
    }

    private async withWriteLock(operation: () => Promise<void>, expectedEpoch?: string): Promise<void> {
        const epoch = expectedEpoch ?? await this.getPersistenceEpoch();
        await this.withLock(async () => {
            if (await this.readEpoch() !== epoch) return;
            await operation();
        });
    }

    async getPersistenceEpoch(): Promise<string> {
        return this.withLock(async () => {
            const existing = await this.readEpoch();
            if (existing) return existing;
            const epoch = crypto.randomUUID();
            const database = await this.open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction(metadataStoreName, "readwrite");
                transaction.objectStore(metadataStoreName).put({ id: workspaceEpochId, value: epoch });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            database.close();
            return epoch;
        });
    }

    private async readEpoch(): Promise<string | undefined> {
        const database = await this.open();
        const record = await this.request<{ id: string, value: string } | undefined>(database.transaction(metadataStoreName, "readonly").objectStore(metadataStoreName).get(workspaceEpochId));
        database.close();
        return record?.value;
    }

    private async withLock<T>(operation: () => Promise<T>): Promise<T> {
        const locks = (navigator as Navigator & { locks?: { request: <R>(name: string, callback: () => Promise<R>) => Promise<R> } }).locks;
        return locks ? locks.request(workspaceLockName, operation) : operation();
    }

    private open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 3);
            request.onupgradeneeded = event => {
                const database = request.result;
                if (!database.objectStoreNames.contains(workspaceStoreName)) database.createObjectStore(workspaceStoreName, { keyPath: "id" });
                if (!database.objectStoreNames.contains(summaryStoreName)) database.createObjectStore(summaryStoreName, { keyPath: "id" });
                if (!database.objectStoreNames.contains(sessionStoreName)) database.createObjectStore(sessionStoreName, { keyPath: "id" });
                if (!database.objectStoreNames.contains(metadataStoreName)) {
                    const metadataStore = database.createObjectStore(metadataStoreName, { keyPath: "id" });
                    metadataStore.put({ id: workspaceEpochId, value: crypto.randomUUID() });
                }

                if (event.oldVersion === 1) {
                    const transaction = request.transaction!;
                    const workspaceStore = transaction.objectStore(workspaceStoreName);
                    const summaryStore = transaction.objectStore(summaryStoreName);
                    const sessionStore = transaction.objectStore(sessionStoreName);
                    const cursorRequest = workspaceStore.openCursor();
                    cursorRequest.onsuccess = () => {
                        const cursor = cursorRequest.result;
                        if (!cursor) return;
                        const record = cursor.value as IWorkspaceRecord;
                        if (record.id === "__last_session__") {
                            const revision = crypto.randomUUID();
                            sessionStore.put({ id: sessionDataId, revision, har: record.har, parsers: record.parsers });
                            sessionStore.put({ id: sessionPreferencesId, revision, preferences: record.preferences });
                            cursor.delete();
                        } else {
                            summaryStore.put({ id: record.id, name: record.name, updatedAt: record.updatedAt });
                        }
                        cursor.continue();
                    };
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("Workspace storage upgrade is blocked by another open tab"));
        });
    }
}