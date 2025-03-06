import { Har } from "har-format";
import { Component } from "preact";
import { classNames } from "../utilities";
import { requestParsers } from "../config";
import { ILoadedParser, ParserManager } from "../components/parser-manager";

export interface IUploadedFiles {
    har: Har;
    harFileName: string;
}

export interface IFilePromptProps {
    onFilesSubmitted: { (files: IUploadedFiles): void }
}

interface IFilePromptState {
    harHighlight?: boolean;
    moduleHighlight?: boolean;
    harFileName?: string;
    parsers?: ILoadedParser[];
}


export class FilePropmt extends Component<IFilePromptProps, IFilePromptState> {

    private harFile: File | undefined = undefined;

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

        const stdClassNames = "border-dashed border-4 rounded-lg p-10 m-5 w-full truncate".split(" ");
        const harClassNames = classNames([...stdClassNames, { "border-accent": !!this.state.harHighlight, "border-neutral": !this.state.harHighlight }]);
        const moduleClassNames = classNames([...stdClassNames, { "border-accent": !!this.state.moduleHighlight, "border-neutral": !this.state.moduleHighlight }]);

        const harFileName = this.state.harFileName || "Har";

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
                            onDrop={e => this.addFile(e)}
                            class={harClassNames}>{harFileName}</div>
                        <div 
                            onDragOver={ e => this.onDragOver(e, false) } 
                            onDragLeave={ () => this.onDragLeave() } 
                            onDrop={ e => this.addParser(e) }
                            class={moduleClassNames}>{renderModules(this.state.parsers, id => this.removeParserFile(id))}</div>
                    </div>
                    <button class="btn btn-primary mt-5" onClick={()=> this.onSubmit()} disabled={!this.state.harFileName}>Load files</button>
                </div>
            </div>
        </div>
        )
    }

    private removeParserFile(id: number) {
        this.parserManager.remove(id);

        this.overwriteStateProps({ parsers: this.parserManager.getLoadedParsers() });

        //location.reload();
    }

    private onSubmit() {

        if (!this.harFile) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", event => {
            if (event.target?.result) {
                this.props.onFilesSubmitted({
                    har: JSON.parse(event.target.result as string),
                    harFileName: this.state.harFileName!
                })
            }
        });
        reader.readAsText(this.harFile);
    }

    private addFile(e: DragEvent) {
        e.preventDefault();

        // unmark the fields
        this.onDragLeave();

        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        this.overwriteStateProps({ harFileName: e.dataTransfer.files[0].name })

        this.harFile = e.dataTransfer.files[0];

        return false;
    }

    private addParser(e: DragEvent) {
        e.preventDefault();

        // unmark the fields
        this.onDragLeave();

        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        Array.from(e.dataTransfer.files).forEach(file => {

            const reader = new FileReader();
            reader.addEventListener("load", event => {
                if (event.target?.result) {

                    console.log("Script processed: " + file.name);

                    this.parserManager.save(file.name, event.target.result as string);

                    // refreshing list
                    this.overwriteStateProps({ parsers: this.parserManager.getLoadedParsers() });
                }
            });
            reader.readAsText(file);
        })
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

const renderModules = (parsers: ILoadedParser[] | undefined, removeParser: { (id: number): void }) => {

    if (!parsers || parsers.length == 0) {
        return "Parsers";
    }

    return (<ul>{parsers.map(p => 
        <li>
            <a href="javascript:void(0)" onClick={() => removeParser(p.id)}>
                <div class="badge badge-warning badge-lg truncate">
                    <svg class="h-[1em] mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5" fill="none" stroke="currentColor"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></g></svg>
                    {p.fileName}
                </div>
            </a>
        </li>
        )}</ul>)
}
