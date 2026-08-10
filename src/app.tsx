import "./app.css"
import { Component } from "preact"
import { FilePrompt } from "./views/file-prompt";
import { IHarFile } from "./types/har-file";
import { HarViewer } from "./views/har-viewer";
import { defaultConfig, IConfig, IRequestParser, IRequestParserContext } from "./types/config";
import { Content } from "har-format";
import { ParserManager } from "./services/parser-manager";
import { WorkspaceStore } from "./services/workspace-store";
import { createDefaultViewPreferences, IRequestViewPreferences, IWorkspaceSummary, normalizeViewPreferences } from "./types/workspace";
import { parserErrorStore } from "./services/parser-error-store";
import "./parsers/generic-parser";
import "./parsers/image-parser";

export interface IAppState {
    config: IConfig;
    parsers: IRequestParser[];
    har: IHarFile | undefined;
    returnedHar?: IHarFile;
    preferences: IRequestViewPreferences;
    workspaces: IWorkspaceSummary[];
    restoringSession: boolean;
}

export class App extends Component<{}, IAppState> {

    private parserManager = new ParserManager();
    private workspaceStore = new WorkspaceStore();
    private sessionDataSaveTimer?: number;
    private sessionPreferencesSaveTimer?: number;
    private workspaceLoadToken = 0;
    private sessionRevision: string = crypto.randomUUID();
    private persistenceGeneration = 0;
    private sessionWriteChain: Promise<void> = Promise.resolve();

    constructor(props: {}) {
        super(props);
        this.parserManager.load();
        this.state = {
            config: { ...defaultConfig },
            parsers: [],
            har: undefined,
            preferences: createDefaultViewPreferences(),
            workspaces: [],
            restoringSession: true,
        };
    }

    async componentDidMount() {
        let workspaces: IWorkspaceSummary[] = [];
        try {
            workspaces = await this.workspaceStore.listWorkspaces();
            const lastSession = await this.workspaceStore.loadLastSession();

            if (lastSession) {
                try {
                    this.parserManager.replaceParsers(lastSession.parsers);
                    this.sessionRevision = lastSession.sessionRevision || crypto.randomUUID();
                    this.setState({
                        ...this.state,
                        config: { ...defaultConfig },
                        parsers: this.parserManager.initializeParsers(parserContext),
                        har: lastSession.har,
                        preferences: normalizeViewPreferences(lastSession.preferences),
                        workspaces,
                        restoringSession: false,
                    });
                    return;
                } catch (error) {
                    parserErrorStore.add("last session", "restore", error);
                    await this.workspaceStore.clearLastSession();
                }
            }

            this.setState({ ...this.state, workspaces, restoringSession: false });
        } catch (error) {
            console.warn("Unable to restore workspace session", error);
            parserErrorStore.add("workspace storage", "restore", error);
            this.setState({ ...this.state, workspaces, restoringSession: false });
        }
    }

    render() {
        if (this.state.restoringSession) {
            return <div class="flex min-h-screen items-center justify-center bg-base-200"><span class="loading loading-spinner loading-lg"></span></div>;
        }

        return this.state.har
            ? <HarViewer
                { ...this.state }
                onGoBack={ har => this.onGoBack(har) }
                onHarChanged={har => this.onHarChanged(har)}
                onPreferencesChanged={preferences => this.onPreferencesChanged(preferences)}
                onSaveWorkspace={name => this.onSaveWorkspace(name)}
                onLoadWorkspace={id => this.onLoadWorkspace(id)}
                onDeleteWorkspace={id => this.onDeleteWorkspace(id)}
                onClearWorkspaceData={() => this.onClearWorkspaceData()}
                onParsersChanged={() => this.onParsersChanged()}
                parserManager={this.parserManager} />
            : <FilePrompt onHarFileLoad={ har => this.onLoad(har) } initialHar={this.state.returnedHar} parserManager={this.parserManager} />
    }

    private onLoad(har: IHarFile) {
        this.workspaceLoadToken++;
        this.sessionRevision = crypto.randomUUID();
        const preferences = {
            ...createDefaultViewPreferences(),
            showHighlightedRequestsOnly: this.loadGlobalHighlightedPreference(),
        };
        this.setState({
            config: {
                ...defaultConfig
            },
            parsers: this.parserManager.initializeParsers(parserContext),
            har: har,
            preferences,
            returnedHar: undefined,
        }, () => this.scheduleSessionDataSave());
    }

    private onParsersChanged() {
        this.workspaceLoadToken++;
        this.sessionRevision = crypto.randomUUID();
        this.setState({
            ...this.state,
            parsers: this.parserManager.initializeParsers(parserContext),
        }, () => this.scheduleSessionDataSave());
    }

    private onGoBack(har: IHarFile) {
        window.clearTimeout(this.sessionDataSaveTimer);
        window.clearTimeout(this.sessionPreferencesSaveTimer);
        this.workspaceLoadToken++;
        this.persistenceGeneration++;
        this.sessionWriteChain = this.sessionWriteChain.catch(() => undefined)
            .then(() => this.workspaceStore.clearLastSession())
            .catch(error => parserErrorStore.add("workspace session", "clear", error));
        this.setState({
            ...this.state,
            har: undefined,
            returnedHar: har,
        });
    }

    private onHarChanged(har: IHarFile) {
        this.workspaceLoadToken++;
        this.sessionRevision = crypto.randomUUID();
        this.setState({ ...this.state, har }, () => this.scheduleSessionDataSave());
    }

    private onPreferencesChanged(preferences: IRequestViewPreferences) {
        try {
            localStorage.setItem("har_viewer_options", JSON.stringify({ showHighlightedRequestsOnly: preferences.showHighlightedRequestsOnly }));
        } catch {
            // Workspace state remains functional when browser storage is unavailable.
        }
        this.setState({ ...this.state, preferences }, () => this.scheduleSessionPreferencesSave());
    }

    private async onSaveWorkspace(name: string) {
        if (!this.state.har || !name.trim()) return;
        const existing = this.state.workspaces.find(workspace => workspace.name.toLowerCase() === name.trim().toLowerCase());
        await this.workspaceStore.saveNamedWorkspace(name, this.getWorkspaceSnapshot(), existing?.id);
        this.setState({ workspaces: await this.workspaceStore.listWorkspaces() });
    }

    private async onLoadWorkspace(id: string) {
        const loadToken = ++this.workspaceLoadToken;
        const workspace = await this.workspaceStore.loadWorkspace(id);
        if (!workspace || loadToken !== this.workspaceLoadToken) return;
        this.parserManager.replaceParsers(workspace.parsers);
        this.sessionRevision = crypto.randomUUID();
        const preferences = normalizeViewPreferences(workspace.preferences);
        this.setState({
            ...this.state,
            config: { ...defaultConfig },
            parsers: this.parserManager.initializeParsers(parserContext),
            har: workspace.har,
            returnedHar: undefined,
            preferences,
        }, () => {
            this.scheduleSessionDataSave();
            this.scheduleSessionPreferencesSave();
        });
    }

    private async onDeleteWorkspace(id: string) {
        await this.workspaceStore.deleteWorkspace(id);
        this.setState({ workspaces: await this.workspaceStore.listWorkspaces() });
    }

    private async onClearWorkspaceData() {
        window.clearTimeout(this.sessionDataSaveTimer);
        window.clearTimeout(this.sessionPreferencesSaveTimer);
        this.workspaceLoadToken++;
        this.persistenceGeneration++;
        await this.sessionWriteChain.catch(() => undefined);
        await this.workspaceStore.clearAll();
        this.parserManager.clearPersistedCache();
        try { localStorage.removeItem("har_viewer_options"); } catch { /* Storage may be unavailable. */ }
        this.setState({ workspaces: [] });
    }

    private getWorkspaceSnapshot() {
        return {
            har: this.state.har!,
            preferences: this.state.preferences,
            parsers: this.parserManager.getParserSnapshots(),
        };
    }

    private scheduleSessionDataSave() {
        if (!this.state.har) return;
        window.clearTimeout(this.sessionDataSaveTimer);
        const generation = this.persistenceGeneration;
        const revision = this.sessionRevision;
        const persistenceEpoch = this.workspaceStore.getPersistenceEpoch();
        this.sessionDataSaveTimer = window.setTimeout(() => {
            this.sessionWriteChain = this.sessionWriteChain.then(async () => {
                if (generation !== this.persistenceGeneration || !this.state.har) return;
                await this.workspaceStore.saveLastSession(revision, this.state.har, this.parserManager.getParserSnapshots(), this.state.preferences, await persistenceEpoch);
            }).catch(error => parserErrorStore.add("workspace session", "autosave data", error));
        }, 500);
    }

    private scheduleSessionPreferencesSave() {
        if (!this.state.har) return;
        window.clearTimeout(this.sessionPreferencesSaveTimer);
        const generation = this.persistenceGeneration;
        const revision = this.sessionRevision;
        const persistenceEpoch = this.workspaceStore.getPersistenceEpoch();
        this.sessionPreferencesSaveTimer = window.setTimeout(() => {
            this.sessionWriteChain = this.sessionWriteChain.then(async () => {
                if (generation !== this.persistenceGeneration) return;
                await this.workspaceStore.saveLastSessionPreferences(revision, this.state.preferences, await persistenceEpoch);
            }).catch(error => parserErrorStore.add("workspace session", "autosave preferences", error));
        }, 250);
    }

    private loadGlobalHighlightedPreference() {
        try {
            const options = JSON.parse(localStorage.getItem("har_viewer_options") || "{}");
            return typeof options.showHighlightedRequestsOnly === "boolean" ? options.showHighlightedRequestsOnly : true;
        } catch {
            return true;
        }
    }
}


const parserContext: IRequestParserContext = {
    getJsonContent: (content: Content) => {
        if (!content.mimeType.includes("application/json") || !content.text) {
            return null;
        }

        try {
            let data = content.text;
            if (content.encoding == "base64") {
                data = atob(data);
            }

            return JSON.parse(data);
        }
        catch (e) {
            console.error("Failed to parse response", e);
        }

        return null;
    }
}