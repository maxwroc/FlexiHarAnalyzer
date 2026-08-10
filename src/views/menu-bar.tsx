import { Component, createRef } from "preact";
import { ISearchOptions, SearchModal } from "./search-modal";
import { ILoadedParser } from "../services/parser-manager";
import { IRequestViewPreferences, IWorkspaceSummary } from "../types/workspace";

interface IMenuBarState {
    searchOpen: boolean;
    workspaceDialogOpen: boolean;
    workspaceName: string;
    workspaceBusy: boolean;
    workspaceError?: string;
}

export class MenuBar extends Component<IMenuBarProps, IMenuBarState> {
    private workspaceNameRef = createRef<HTMLInputElement>();

    constructor(props: IMenuBarProps) {
        super(props);
        this.state = {
            searchOpen: false,
            workspaceDialogOpen: false,
            workspaceName: "",
            workspaceBusy: false,
        };
    }

    componentDidUpdate(_previousProps: IMenuBarProps, previousState: IMenuBarState) {
        if (this.state.workspaceDialogOpen && !previousState.workspaceDialogOpen) {
            this.workspaceNameRef.current?.focus();
        }
    }

    private onSearch = (options: ISearchOptions) => {
        this.setState({ searchOpen: false });
        this.props.onSearch(options);
    };

    render() {
        return <>
        <div class="navbar bg-neutral">
            <div class="navbar-start">
                <div class="dropdown">
                    <div tabindex={0} role="button" class="btn btn-ghost btn-circle">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </div>
                    <ul
                        tabindex={0}
                        class="menu menu-sm dropdown-content bg-neutral rounded-box z-[1] mt-3 p-2 shadow">
                        <li><a class="text-nowrap" onClick={() => this.props.onGoBack()}>Open another file</a></li>
                        {this.props.parsers.length > 0 && (
                            <li>
                                <details>
                                    <summary class="text-nowrap">Edit parser</summary>
                                    <ul class="bg-neutral rounded-box z-[2] p-2 shadow min-w-max">
                                        {this.props.parsers.map(p => (
                                            <li key={p.id}><a class="text-nowrap" onClick={() => this.props.onEditParser(p.id)}>{p.fileName}</a></li>
                                        ))}
                                    </ul>
                                </details>
                            </li>
                        )}
                        <li>
                            <details>
                                <summary class="text-nowrap">Workspaces</summary>
                                <ul class="min-w-56 bg-neutral p-2 shadow">
                                    <li><button onClick={() => this.setState({ workspaceDialogOpen: true, workspaceName: "", workspaceError: undefined })}>Save current workspace</button></li>
                                    {this.props.workspaces.map(workspace => (
                                        <li class="flex-row items-center">
                                            <button class="min-w-0 flex-1 truncate text-left" title={workspace.name} onClick={() => this.runWorkspaceAction(() => this.props.onLoadWorkspace(workspace.id))}>{workspace.name}</button>
                                            <button class="btn btn-ghost btn-xs btn-square" title="Delete workspace" aria-label={`Delete ${workspace.name}`} onClick={event => { event.stopPropagation(); this.deleteWorkspace(workspace); }}>×</button>
                                        </li>
                                    ))}
                                    {this.props.workspaces.length === 0 && <li><span class="text-xs opacity-60">No saved workspaces</span></li>}
                                    <li><button class="text-error" onClick={() => this.clearWorkspaceData()}>Clear saved workspace data</button></li>
                                </ul>
                            </details>
                        </li>
                        <li><label class="text-nowrap"><input type="checkbox" checked={this.props.preferences.showHighlightedRequestsOnly} class="checkbox checkbox-xs" onChange={() => this.props.onPreferencesChange({...this.props.preferences, showHighlightedRequestsOnly: !this.props.preferences.showHighlightedRequestsOnly})} />Show highlighted requests only</label></li>
                    </ul>
                </div>
            </div>
            <div class="navbar-center">
                <span class="text-xl px-4">{ this.props.fileName ? this.props.fileName + " - " : "" }HAR analyzer</span>
                <span class="text-[10px] opacity-30 self-end mb-1">{typeof __APP_VERSION__ !== "undefined" ? "v" + __APP_VERSION__ : ""}</span>
            </div>
            <div class="navbar-end">
                {this.props.searchPills.map((pill, i) => (
                    <div
                        key={i}
                        class={`badge gap-1 cursor-pointer ml-1 select-none ${i === this.props.activeSearchIndex ? "badge-secondary" : "badge-outline"}`}
                        onClick={() => this.props.onPillClick(i)}
                        title={pill.query}
                    >
                        <span class="max-w-[100px] truncate text-xs">{pill.query}</span>
                        <button
                            class="btn btn-ghost btn-circle p-0"
                            style="min-height:0;height:14px;width:14px;"
                            onClick={(e) => { e.stopPropagation(); this.props.onPillRemove(i); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
                <button class="btn btn-ghost btn-circle" id="search-button" onClick={() => this.setState({ searchOpen: true })}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <SearchModal
                    isOpen={!!this.state.searchOpen}
                    onClose={() => this.setState({ searchOpen: false })}
                    onSearch={this.onSearch}
                />
            </div>
        </div>
        {this.state.workspaceDialogOpen && (
            <div class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" onKeyDown={event => { if (event.key === "Escape") this.setState({ workspaceDialogOpen: false }); }} onMouseDown={event => { if (event.target === event.currentTarget) this.setState({ workspaceDialogOpen: false }); }}>
                <div class="modal-box max-w-md">
                    <h3 id="workspace-dialog-title" class="text-lg font-bold">Save workspace</h3>
                    <p class="mt-2 text-sm opacity-70">HAR contents and parser source are stored locally in this browser.</p>
                    <input
                        ref={this.workspaceNameRef}
                        class="input input-bordered mt-4 w-full"
                        aria-label="Workspace name"
                        placeholder="Investigation name"
                        value={this.state.workspaceName}
                        onInput={event => this.setState({ workspaceName: (event.target as HTMLInputElement).value })}
                        onKeyDown={event => { if (event.key === "Enter" && !this.state.workspaceBusy) this.saveWorkspace(); }} />
                    {this.state.workspaceError && <div class="mt-3 text-sm text-error" role="alert">{this.state.workspaceError}</div>}
                    <div class="modal-action">
                        <button class="btn btn-ghost" disabled={this.state.workspaceBusy} onClick={() => this.setState({ workspaceDialogOpen: false })}>Cancel</button>
                        <button class="btn btn-primary" disabled={!this.state.workspaceName.trim() || this.state.workspaceBusy} onClick={() => this.saveWorkspace()}>{this.state.workspaceBusy ? <span class="loading loading-spinner loading-sm"></span> : "Save"}</button>
                    </div>
                </div>
            </div>
        )}
        </>
    }

    private async saveWorkspace() {
        const name = this.state.workspaceName.trim();
        if (!name) return;
        const existing = this.props.workspaces.find(workspace => workspace.name.toLowerCase() === name.toLowerCase());
        if (existing && !confirm(`Replace workspace "${existing.name}" with the current investigation?`)) return;
        this.setState({ workspaceBusy: true, workspaceError: undefined });
        try {
            await this.props.onSaveWorkspace(name);
            this.setState({ workspaceDialogOpen: false, workspaceName: "", workspaceBusy: false });
        } catch (error) {
            this.setState({ workspaceBusy: false, workspaceError: error instanceof Error ? error.message : "Unable to save workspace" });
        }
    }

    private async runWorkspaceAction(action: () => Promise<void>) {
        try {
            await action();
        } catch (error) {
            console.error("Workspace operation failed", error);
            alert(error instanceof Error ? error.message : "Workspace operation failed");
        }
    }

    private deleteWorkspace(workspace: IWorkspaceSummary) {
        if (!confirm(`Delete workspace "${workspace.name}"?`)) return;
        void this.runWorkspaceAction(() => this.props.onDeleteWorkspace(workspace.id));
    }

    private clearWorkspaceData() {
        if (!confirm("Clear the saved session and all named workspaces from this browser?")) return;
        void this.runWorkspaceAction(() => this.props.onClearWorkspaceData());
    }
}

interface IMenuBarProps { 
    preferences: IRequestViewPreferences;
    workspaces: IWorkspaceSummary[];
    onPreferencesChange: { (preferences: IRequestViewPreferences): void };
    onSaveWorkspace: { (name: string): Promise<void> };
    onLoadWorkspace: { (id: string): Promise<void> };
    onDeleteWorkspace: { (id: string): Promise<void> };
    onClearWorkspaceData: { (): Promise<void> };
    onSearch: { (options: ISearchOptions): void };
    onGoBack: { (): void };
    onEditParser: { (id: number): void };
    onPillClick: { (index: number): void };
    onPillRemove: { (index: number): void };
    searchPills: ISearchOptions[];
    activeSearchIndex: number;
    parsers: ILoadedParser[];
    fileName: string;
}