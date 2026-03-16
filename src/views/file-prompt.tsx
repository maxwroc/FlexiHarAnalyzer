import { Har } from "har-format";
import { Component, createRef } from "preact";
import { classNames } from "../utils/view-helpers";
import { FileReaderExt } from "../services/file-reader";
import { IHarFile } from "../types/har-file";
import { ParserList } from "./parser-list";
import { ParserErrorToast } from "./parser-error-toast";
import { parserErrorStore } from "../services/parser-error-store";
import { ParserManager } from "../services/parser-manager";
import examples from "virtual:examples";

export interface IFilePromptProps {
    onHarFileLoad: { (har: IHarFile): void };
    initialHar?: IHarFile;
    parserManager: ParserManager;
}

interface IFilePromptState {
    harHighlight?: boolean;
    harFile?: FileReaderExt<Har>;
    loadedHar?: IHarFile;
    parseError?: string;
    repairing?: boolean;
    loadingExample?: boolean;
}


export class FilePrompt extends Component<IFilePromptProps, IFilePromptState> {

    private repairDialogRef = createRef<HTMLDialogElement>();
    private parserListRef = createRef<ParserList>();

    constructor(props: IFilePromptProps) {
        super(props);

        this.state = {
            harHighlight: false,
            loadedHar: props.initialHar,
        }
    }


    render() {

        const stdClassNames = "border-dashed border-4 rounded-lg p-10 mt-5 w-full truncate".split(" ");
        const harClassNames = classNames([...stdClassNames, { "border-accent": !!this.state.harHighlight, "border-neutral": !this.state.harHighlight }]);

        const harFileName = this.state.loadedHar?.name || this.state.harFile?.name || "Har";

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
                            onDragOver={ e => this.onDragOver(e) }
                            onDragLeave={ () => this.onDragLeave() }
                            onDrop={e => this.addHar(e)}
                            class={harClassNames}>{harFileName}</div>
                        <ParserList ref={this.parserListRef} parserManager={this.props.parserManager} />
                    </div>
                    <div class="flex justify-between items-center mt-5">
                        {examples.length > 0 ? (
                            <div class="dropdown">
                                <label tabindex={0} class="btn btn-ghost btn-sm gap-1">
                                    {this.state.loadingExample
                                        ? <span class="loading loading-spinner loading-xs"></span>
                                        : <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                                    Load example
                                </label>
                                {!this.state.loadingExample && (
                                    <ul tabindex={0} class="dropdown-content menu p-2 shadow-lg bg-neutral text-neutral-content border border-base-content/20 rounded-box w-52 z-10">
                                        {examples.map(ex => (
                                            <li><a onClick={() => { (document.activeElement as HTMLElement)?.blur(); this.loadExample(ex); }}>{ex.name}</a></li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : <div />}
                        <button class="btn btn-primary" onClick={()=> this.onSubmit()} disabled={!harFileName}>Load files</button>
                    </div>
                </div>
            </div>

            {/* Repair confirmation dialog */}
            <dialog ref={this.repairDialogRef} class="modal">
                <div class="modal-box">
                    <h3 class="font-bold text-lg">Broken HAR file</h3>
                    <p class="py-2">The file could not be parsed as valid JSON:</p>
                    <pre class="text-xs bg-base-200 p-3 rounded overflow-x-auto whitespace-pre-wrap">{this.state.parseError}</pre>
                    <p class="py-2">This usually means the file is incomplete (recording was interrupted or the file was truncated).</p>
                    <div class="alert alert-warning mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span class="text-sm">We can attempt to repair the JSON structure so that at least part of the file is viewable. <strong>Missing data cannot be recovered.</strong></span>
                    </div>
                    <div class="modal-action">
                        <button class="btn" onClick={() => this.repairDialogRef.current?.close()}>Cancel</button>
                        <button
                            class="btn btn-warning"
                            disabled={this.state.repairing}
                            onClick={() => this.onRepairConfirmed()}
                        >
                            {this.state.repairing ? <span class="loading loading-spinner loading-sm"></span> : "Try to repair"}
                        </button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <ParserErrorToast />
        </div>
        )
    }

    private async loadExample(example: typeof examples[number]) {
        this.setState({ loadingExample: true });

        try {
            const basePath = import.meta.env.BASE_URL + 'examples/';
            const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

            const harRes = await fetch(basePath + encodePath(example.harFile));
            const harContent: Har = await harRes.json();

            const parserContents: { name: string; content: string }[] = [];
            for (const parser of example.parsers) {
                const parserRes = await fetch(basePath + encodePath(parser.path));
                const parserContent = await parserRes.text();
                parserContents.push({ name: parser.name, content: parserContent });
            }

            this.parserListRef.current?.replaceAllParsers(parserContents);

            const harFileName = example.harFile.split('/').pop() || example.name;

            this.setState({
                loadedHar: { name: harFileName, content: harContent },
                loadingExample: false,
                harFile: undefined,
            });
        } catch (e) {
            console.error('Failed to load example', e);
            parserErrorStore.add(example.name, 'loadExample', e);
            this.setState({ loadingExample: false });
        }
    }

    private async onSubmit() {

        if (this.state.loadedHar) {
            this.props.onHarFileLoad(this.state.loadedHar);
            return;
        }

        if (!this.state.harFile) {
            return;
        }

        const result = await this.state.harFile.getJson();

        if (result.data) {
            this.props.onHarFileLoad({
                name: this.state.harFile.name,
                content: result.data,
            });
        } else if (result.error) {
            this.setState({ parseError: result.error });
            this.repairDialogRef.current?.showModal();
        }
    }

    private async onRepairConfirmed() {
        if (!this.state.harFile) return;

        this.setState({ repairing: true });

        const repaired = await this.state.harFile.getRepairedJson();

        this.setState({ repairing: false });
        this.repairDialogRef.current?.close();

        if (repaired) {
            this.props.onHarFileLoad({
                name: this.state.harFile.name,
                content: repaired,
            });
        } else {
            this.setState({ parseError: "Repair failed — the file is too corrupted to recover." });
            this.repairDialogRef.current?.showModal();
        }
    }

    private addHar(e: DragEvent) {
        e.preventDefault();

        // unmark the fields
        this.onDragLeave();

        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        this.setState({ ...this.state, harFile: new FileReaderExt<Har>(e.dataTransfer.files[0]), loadedHar: undefined });

        return false;
    }

    private onDragOver(e: DragEvent) {
        e.preventDefault();
        this.setState({ ...this.state, harHighlight: true });

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "copy";
        }
    }

    private onDragLeave() {
        this.setState({ ...this.state, harHighlight: false });
    }
}
