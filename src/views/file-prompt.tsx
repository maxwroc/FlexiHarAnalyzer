import { Har } from "har-format";
import { Component } from "preact";
import { classNames } from "../utils/view-helpers";
import { ILoadedParser, ParserManager } from "../services/parser-manager";
import { FileReaderExt } from "../services/file-reader";
import { ParserEditor } from "./parser-editor";
import { newParserTemplate } from "../services/parser-editor/parser-template";

export interface IHarFile {
    name: string,
    content: Har,
}
export interface IFilePromptProps {
    onHarFileLoad: { (har: IHarFile): void }
}

interface IEditorState {
    parserId?: number;
    fileName: string;
    content: string;
    isNew: boolean;
}

interface IFilePromptState {
    harHighlight?: boolean;
    moduleHighlight?: boolean;
    harFile?: FileReaderExt<Har>;
    parsers?: ILoadedParser[];
    editor?: IEditorState;
    deleteConfirmId?: number;
}


export class FilePrompt extends Component<IFilePromptProps, IFilePromptState> {

    private parserManager = new ParserManager();

    constructor() {
        super();

        this.parserManager.load();

        this.state = {
            harHighlight: false,
            moduleHighlight: false,
            parsers: this.parserManager.getLoadedParsers(),
        }
    }


    render() {

        const stdClassNames = "border-dashed border-4 rounded-lg p-10 mt-5 w-full truncate".split(" ");
        const harClassNames = classNames([...stdClassNames, { "border-accent": !!this.state.harHighlight, "border-neutral": !this.state.harHighlight }]);
        const moduleClassNames = classNames([...stdClassNames, { "border-accent": !!this.state.moduleHighlight, "border-neutral": !this.state.moduleHighlight }]);

        const harFileName = this.state.harFile?.name || "Har";

        return (
        <div class="hero bg-base-200 min-h-screen">
            <div class="hero-content text-center border-solid border-2 border-primary rounded-lg p-20">
                <div class="max-w-md">
                    <h1 class="text-5xl font-bold">HAR File Analyzer</h1>
                    <p class="pt-5">
                        Please drag and drop the files in the below boxes
                    </p>
                    <div>
                        <div 
                            onDragOver={ e => this.onDragOver(e, true) } 
                            onDragLeave={ () => this.onDragLeave() } 
                            onDrop={e => this.addHar(e)}
                            class={harClassNames}>{harFileName}</div>
                        <div 
                            onDragOver={ e => this.onDragOver(e, false) } 
                            onDragLeave={ () => this.onDragLeave() } 
                            onDrop={ e => this.addParser(e) }
                            class={moduleClassNames}>{renderParserList(this.state.parsers, id => this.confirmDelete(id), id => this.openEditor(id), this.state.deleteConfirmId, id => this.removeParserFile(id), () => this.cancelDelete())}</div>
                    </div>
                    <div class="flex justify-between mt-5">
                        <button class="btn btn-neutral" onClick={() => this.openNewEditor()}>+ New parser</button>
                        <button class="btn btn-primary" onClick={()=> this.onSubmit()} disabled={!harFileName}>Load files</button>
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
            </div>
        </div>
        )
    }

    private confirmDelete(id: number) {
        this.overwriteStateProps({ deleteConfirmId: id });
    }

    private cancelDelete() {
        this.overwriteStateProps({ deleteConfirmId: undefined });
    }

    private removeParserFile(id: number) {
        this.parserManager.remove(id);

        this.overwriteStateProps({ parsers: this.parserManager.getLoadedParsers(), deleteConfirmId: undefined });
    }

    private openEditor(id: number) {
        const content = this.parserManager.getFileContent(id);
        const parser = this.parserManager.getLoadedParsers().find(p => p.id === id);
        if (content == null || !parser) return;

        this.overwriteStateProps({
            editor: {
                parserId: id,
                fileName: parser.fileName,
                content: content,
                isNew: false,
            },
        });
    }

    private openNewEditor() {
        this.overwriteStateProps({
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

        this.overwriteStateProps({
            parsers: this.parserManager.getLoadedParsers(),
            editor: undefined,
        });
    }

    private closeEditor() {
        this.overwriteStateProps({ editor: undefined });
    }

    private async onSubmit() {

        if (!this.state.harFile) {
            return;
        }

        const jsonContent = await this.state.harFile.getJson();

        if (jsonContent) {
            this.props.onHarFileLoad({
                name: this.state.harFile.name,
                content: jsonContent,
            });
        }
    }

    private addHar(e: DragEvent) {
        e.preventDefault();

        // unmark the fields
        this.onDragLeave();

        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        this.overwriteStateProps({ harFile: new FileReaderExt<Har>(e.dataTransfer.files[0])});

        return false;
    }

    private addParser(e: DragEvent) {
        e.preventDefault();

        // unmark the fields
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
                console.log("set true");
            }

            // for the last file we check whether we should update UI list
            if (updated && index == (arr.length - 1)) {
                // refreshing list
                console.log("ref pars")
                this.overwriteStateProps({ parsers: this.parserManager.getLoadedParsers() });
            }
        });
    }

    private onDragOver(e: DragEvent, isHarDrop: boolean) {
        e.preventDefault();

        if (isHarDrop) {
            this.setState({ harHighlight: true })
        }
        else {
            this.setState({ moduleHighlight: true })
        }

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "copy";
        }
    }

    private onDragLeave() {
        this.overwriteStateProps({
            harHighlight: false,
            moduleHighlight: false,
        });
    }

    private overwriteStateProps(props: IFilePromptState) {
        this.setState({
            ...this.state,
            ...props
        });
    }
}

const renderParserList = (
    parsers: ILoadedParser[] | undefined,
    requestDelete: { (id: number): void },
    editParser: { (id: number): void },
    deleteConfirmId: number | undefined,
    confirmDelete: { (id: number): void },
    cancelDelete: { (): void },
) => {

    if (!parsers || parsers.length == 0) {
        return "Parsers";
    }

    return (<ul>{parsers.map(p => 
        <li class="mb-1">
            {deleteConfirmId === p.id ? (
                <div class="badge badge-error badge-lg gap-1">
                    <span class="mr-1">Delete?</span>
                    <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Confirm delete" onClick={() => confirmDelete(p.id)}>
                        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                    <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Cancel" onClick={() => cancelDelete()}>
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
                    <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Edit parser" onClick={() => editParser(p.id)}>
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button class="btn btn-ghost btn-xs px-1 min-h-0 h-auto" title="Delete parser" onClick={() => requestDelete(p.id)}>
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )}
        </li>
        )}</ul>)
}

