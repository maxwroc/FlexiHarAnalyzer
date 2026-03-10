import { Component } from "preact";
import { ILoadedParser, ParserManager } from "../services/parser-manager";
import { FileReaderExt } from "../services/file-reader";
import { ParserEditor } from "./parser-editor";
import { newParserTemplate } from "../services/parser-editor/parser-template";

interface IEditorState {
    parserId?: number;
    fileName: string;
    content: string;
    isNew: boolean;
}

interface IParserListState {
    moduleHighlight?: boolean;
    parsers?: ILoadedParser[];
    editor?: IEditorState;
    deleteConfirmId?: number;
}

export class ParserList extends Component<{}, IParserListState> {

    private parserManager = new ParserManager();

    constructor(props: {}) {
        super(props);

        this.parserManager.load();

        this.state = {
            moduleHighlight: false,
            parsers: this.parserManager.getLoadedParsers(),
        };
    }

    render() {
        const stdClassNames = "border-dashed border-4 rounded-lg p-10 mt-5 w-full truncate".split(" ");
        const isHighlighted = !!this.state.moduleHighlight;
        const moduleClassNames = stdClassNames.concat(isHighlighted ? "border-accent" : "border-neutral").join(" ");

        return (
            <div>
                <div
                    onDragOver={e => this.onDragOver(e)}
                    onDragLeave={() => this.onDragLeave()}
                    onDrop={e => this.addParser(e)}
                    class={moduleClassNames}
                >
                    {this.renderBadges()}
                </div>

                <ParserEditor
                    isOpen={!!this.state.editor}
                    fileName={this.state.editor?.fileName || ""}
                    fileContent={this.state.editor?.content || ""}
                    isNew={!!this.state.editor?.isNew}
                    onSave={(fileName, content) => this.saveFromEditor(fileName, content)}
                    onClose={() => this.closeEditor()}
                />
            </div>
        );
    }

    private renderBadges() {
        const parsers = this.state.parsers;
        const deleteConfirmId = this.state.deleteConfirmId;

        const newParserPill = (
            <li class="mb-1">
                <button class="badge badge-neutral badge-lg gap-1 cursor-pointer hover:badge-accent" onClick={() => this.openNewEditor()}>+ New parser</button>
            </li>
        );

        if (!parsers || parsers.length == 0) {
            return (
                <ul>
                    {newParserPill}
                </ul>
            );
        }

        return (
            <ul>
                {parsers.map(p => (
                    <li class="mb-1">
                        {deleteConfirmId === p.id ? (
                            <div class="badge badge-error badge-lg gap-1">
                                <span class="mr-1">Delete?</span>
                                <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Confirm delete" onClick={() => this.removeParserFile(p.id)}>
                                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                                <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Cancel" onClick={() => this.cancelDelete()}>
                                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div class="badge badge-warning badge-lg gap-0 pr-0">
                                <svg class="h-[1em] mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5" fill="none" stroke="currentColor"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></g></svg>
                                <span class="truncate">{p.fileName}</span>
                                <div class="divider divider-horizontal mx-1"></div>
                                <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Edit parser" onClick={() => this.openEditor(p.id)}>
                                    <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Delete parser" onClick={() => this.confirmDelete(p.id)}>
                                    <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </li>
                ))}
                {newParserPill}
            </ul>
        );
    }

    private confirmDelete(id: number) {
        this.setState({ ...this.state, deleteConfirmId: id });
    }

    private cancelDelete() {
        this.setState({ ...this.state, deleteConfirmId: undefined });
    }

    private removeParserFile(id: number) {
        this.parserManager.remove(id);
        this.setState({ ...this.state, parsers: this.parserManager.getLoadedParsers(), deleteConfirmId: undefined });
    }

    private openEditor(id: number) {
        const content = this.parserManager.getFileContent(id);
        const parser = this.parserManager.getLoadedParsers().find(p => p.id === id);
        if (content == null || !parser) return;

        this.setState({
            ...this.state,
            editor: {
                parserId: id,
                fileName: parser.fileName,
                content: content,
                isNew: false,
            },
        });
    }

    private openNewEditor() {
        this.setState({
            ...this.state,
            editor: {
                fileName: "my-parser.js",
                content: newParserTemplate,
                isNew: true,
            },
        });
    }

    private saveFromEditor(fileName: string, content: string) {
        if (this.state.editor?.isNew) {
            this.parserManager.save(fileName, content);
        } else if (this.state.editor?.parserId != null) {
            this.parserManager.update(this.state.editor.parserId, content);
        }

        this.setState({
            ...this.state,
            parsers: this.parserManager.getLoadedParsers(),
            editor: undefined,
        });
    }

    private closeEditor() {
        this.setState({ ...this.state, editor: undefined });
    }

    private addParser(e: DragEvent) {
        e.preventDefault();
        this.onDragLeave();

        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        let updated = false;
        Array.from(e.dataTransfer.files).forEach(async (f, index, arr) => {
            const file = new FileReaderExt(f);

            const content = await file.getText();
            if (content) {
                this.parserManager.save(file.name, content);
                console.log("Script processed: " + file.name);
                updated = true;
            }

            if (updated && index == (arr.length - 1)) {
                this.setState({ ...this.state, parsers: this.parserManager.getLoadedParsers() });
            }
        });
    }

    private onDragOver(e: DragEvent) {
        e.preventDefault();
        this.setState({ ...this.state, moduleHighlight: true });

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "copy";
        }
    }

    private onDragLeave() {
        this.setState({ ...this.state, moduleHighlight: false });
    }
}
