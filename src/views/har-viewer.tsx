import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry, Har } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";
import { MenuBar } from "./menu-bar";
import { classNames } from "../utils/view-helpers";
import { FileReaderExt } from "../services/file-reader";
import { IHarFile } from "../types/har-file";
import { ISearchResult, searchEntries } from "../services/search-engine";
import { ISearchOptions } from "./search-modal";
import { ILoadedParser, ParserManager } from "../services/parser-manager";
import { ParserEditor } from "./parser-editor";
import { ParserErrorToast } from "./parser-error-toast";
import { parserErrorStore } from "../services/parser-error-store";
import { IRequestViewPreferences, IWorkspaceSummary, normalizeViewPreferences } from "../types/workspace";

interface IEditorState {
    parserId: number;
    fileName: string;
    content: string;
}

interface IHarViewerState {
    preferences: IRequestViewPreferences,
    entry: Entry | undefined, 
    entryIndex: number,
    droppingFile: boolean, 
    har: IHarFile,
    searchResult: ISearchResult | undefined,
    loadedParsers: ILoadedParser[],
    editor?: IEditorState,
}

interface IHarViewerProps extends IAppState {
    onGoBack: (har: IHarFile) => void;
    onHarChanged: (har: IHarFile) => void;
    onPreferencesChanged: (preferences: IRequestViewPreferences) => void;
    onSaveWorkspace: (name: string) => Promise<void>;
    onLoadWorkspace: (id: string) => Promise<void>;
    onDeleteWorkspace: (id: string) => Promise<void>;
    onClearWorkspaceData: () => Promise<void>;
    onParsersChanged: () => void;
    parserManager: ParserManager;
    preferences: IRequestViewPreferences;
    workspaces: IWorkspaceSummary[];
}

export class HarViewer extends Component<IHarViewerProps, IHarViewerState> {

    constructor(props: IHarViewerProps) {
        super(props);

        const preferences = normalizeViewPreferences(props.preferences);
        this.state = {
            preferences,
            entry: undefined,
            entryIndex: -1,
            droppingFile: false,
            har: props.har!,
            searchResult: getActiveSearchResult(props.har!, preferences),
            loadedParsers: props.parserManager.getLoadedParsers(),
        }

        updateWindowTitle(this.state.har.name);
    }

    componentDidUpdate(previousProps: IHarViewerProps) {
        if (this.props.har !== previousProps.har || (this.props.preferences !== previousProps.preferences && this.props.preferences !== this.state.preferences)) {
            const preferences = normalizeViewPreferences(this.props.preferences);
            this.setState({
                ...this.state,
                har: this.props.har!,
                preferences,
                searchResult: getActiveSearchResult(this.props.har!, preferences),
                loadedParsers: this.props.parserManager.getLoadedParsers(),
                entry: undefined,
                entryIndex: -1,
            });
            updateWindowTitle(this.props.har!.name);
        }
    }

    render() {

        const stdClassNames = "request-list w-1/2 pl-3 min-w-0".split(" ");
        const equestListContainerClasses = classNames([...stdClassNames, { "outline-dashed": !!this.state.droppingFile }]);

        console.log("har-view rendering", this.state.har);

        return (
        <div class="flex flex-col w-full" style="height: 100vh">
            <MenuBar 
                preferences={this.state.preferences}
                workspaces={this.props.workspaces}
                onPreferencesChange={preferences => this.updatePreferences(preferences)}
                onSaveWorkspace={name => this.props.onSaveWorkspace(name)}
                onLoadWorkspace={id => this.props.onLoadWorkspace(id)}
                onDeleteWorkspace={id => this.props.onDeleteWorkspace(id)}
                onClearWorkspaceData={() => this.props.onClearWorkspaceData()}
                onSearch={(options) => this.onSearch(options)}
                onGoBack={() => this.props.onGoBack(this.state.har)}
                onEditParser={(id) => this.openEditor(id)}
                onPillClick={(index) => this.onPillClick(index)}
                onPillRemove={(index) => this.onPillRemove(index)}
                searchPills={this.state.preferences.searchHistory}
                activeSearchIndex={this.state.preferences.activeSearchIndex}
                parsers={this.state.loadedParsers}
                fileName={this.state.har.name} />
            <div class="flex mt-3 overflow-hidden" style="flex: 1 1 0%; min-height: 0">
                <div 
                    class={equestListContainerClasses}
                    onDragOver={ e => this.onDragOver(e) } 
                    onDragLeave={ () => this.onDragLeave() } 
                    onDrop={e => this.onHarFileDrop(e)}>
                    <RequestList 
                        config={this.props.config} 
                        har={this.state.har} 
                        parsers={this.props.parsers} 
                        preferences={this.state.preferences}
                        searchResult={this.state.searchResult}
                        onPreferencesChange={preferences => this.updatePreferences(preferences)}
                        onRequestClick={(entry, index) => this.setState({ ...this.state, entry, entryIndex: index })} />
                </div>

                <div class="request-details w-1/2 overflow-auto pl-2 pr-3 min-w-0">
                    <RequestViewer
                        entry={this.state.entry}
                        entryIndex={this.state.entryIndex}
                        parsers={this.props.parsers}
                        searchResult={this.state.searchResult}
                        activeTab={this.state.preferences.activeTab}
                        onActiveTabChange={activeTab => this.updatePreferences({ ...this.state.preferences, activeTab })} />
                </div>
            </div>
            <ParserEditor
                isOpen={!!this.state.editor}
                fileName={this.state.editor?.fileName || ""}
                fileContent={this.state.editor?.content || ""}
                isNew={false}
                onSave={(_fileName, content) => this.saveParser(content)}
                onClose={() => this.closeEditor()}
            />
            <ParserErrorToast />
        </div>
        )
    }

    private updatePreferences(preferences: IRequestViewPreferences, searchResult = this.state.searchResult) {
        this.setState({ ...this.state, preferences, searchResult });
        this.props.onPreferencesChanged(preferences);
    }

    private openEditor(id: number) {
        const content = this.props.parserManager.getFileContent(id);
        const parser = this.state.loadedParsers.find(p => p.id === id);
        if (content == null || !parser) return;

        this.setState({
            ...this.state,
            editor: {
                parserId: id,
                fileName: parser.fileName,
                content: content,
            },
        });
    }

    private saveParser(content: string) {
        if (this.state.editor == null) return;

        if (!this.props.parserManager.update(this.state.editor.parserId, content)) return;
        this.props.onParsersChanged();

        this.setState({
            ...this.state,
            editor: undefined,
            loadedParsers: this.props.parserManager.getLoadedParsers(),
        });
    }

    private closeEditor() {
        this.setState({ ...this.state, editor: undefined });
    }

    private onDragOver(e: DragEvent) {
        e.preventDefault();

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "copy";
        }

        // do not re-render if the state is the same
        if (!this.state.droppingFile) {
            this.setState({ ...this.state, droppingFile: true });
        }
    }

    private onDragLeave() {
        if (this.state.droppingFile) {
            this.setState({ ...this.state, droppingFile: false });
        }
    }

    private onSearch(options: ISearchOptions) {
        const result = searchEntries(this.state.har.content.log.entries, options);
        const searchHistory = [...this.state.preferences.searchHistory, options];
        this.updatePreferences({ ...this.state.preferences, searchHistory, activeSearchIndex: searchHistory.length - 1, activeTab: "Search" }, result);
    }

    private onPillClick(index: number) {
        const options = this.state.preferences.searchHistory[index];
        const result = searchEntries(this.state.har.content.log.entries, options);
        this.updatePreferences({ ...this.state.preferences, activeSearchIndex: index, activeTab: "Search" }, result);
    }

    private onPillRemove(index: number) {
        const searchHistory = this.state.preferences.searchHistory.filter((_, i) => i !== index);
        const wasActive = index === this.state.preferences.activeSearchIndex;

        if (wasActive) {
            this.updatePreferences({ ...this.state.preferences, searchHistory, activeSearchIndex: -1, activeTab: this.state.preferences.activeTab === "Search" ? "Request" : this.state.preferences.activeTab }, undefined);
        } else {
            const activeSearchIndex = this.state.preferences.activeSearchIndex > index
                ? this.state.preferences.activeSearchIndex - 1
                : this.state.preferences.activeSearchIndex;
            this.updatePreferences({ ...this.state.preferences, searchHistory, activeSearchIndex });
        }
    }

    private async onHarFileDrop(e: DragEvent) {
        
        e.preventDefault();

        // removing overlay
        this.onDragLeave();
        
        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        const file = new FileReaderExt<Har>(e.dataTransfer.files[0]);

        const result = await file.getJson();
        if (result.data) {
            const newHar = {
                name: file.name,
                content: result.data,
            }

            updateWindowTitle(file.name);

            this.props.onHarChanged(newHar);
        }
        else if (result.error) {
            parserErrorStore.add(file.name, "parse", new Error(result.error));
        }
    }
}

const getActiveSearchResult = (har: IHarFile, preferences: IRequestViewPreferences) => {
    const activeSearch = preferences.searchHistory[preferences.activeSearchIndex];
    return activeSearch ? searchEntries(har.content.log.entries, activeSearch) : undefined;
};

const updateWindowTitle = (harFileName: string) => document.title = harFileName + " - Har Analyser";
