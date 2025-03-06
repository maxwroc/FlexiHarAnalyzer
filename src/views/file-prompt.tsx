import { Har } from "har-format";
import { Component } from "preact";
import { classNames } from "../utilities";
import { IRequestParser, requestParsers } from "../config";

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
    parsers: string[];
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
            parsers: Object.keys(requestParsers),
        }
    }


    render() {

        const stdClassNames = "flex-1 border-dashed border-4 rounded-lg p-10 m-5".split(" ");
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
                    <div class="flex">
                        <div 
                            onDragOver={ e => this.onDragOver(e, true) } 
                            onDragLeave={ () => this.onDragLeave() } 
                            onDrop={e => this.addFile(e)}
                            class={harClassNames}>{harFileName}</div>
                        <div 
                            onDragOver={ e => this.onDragOver(e, false) } 
                            onDragLeave={ () => this.onDragLeave() } 
                            onDrop={ e => this.addParser(e) }
                            class={moduleClassNames}>{renderModules(this.parserManager.getLoadedParsers())}</div>
                    </div>
                    <button class="btn btn-primary mt-5" onClick={()=> this.onSubmit()} disabled={!this.state.harFileName}>Load files</button>
                </div>
            </div>
        </div>
        )
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

        this.overwriteStateProps({ harFileName: e.dataTransfer.files[0].name, parsers: [] })

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
                    this.setState({ ...this.state, ...{ parsers: Object.keys(requestParsers) } });
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
            parsers: [],
        });
    }

    private overwriteStateProps(props: IFilePromptState) {
        this.setState({
            ...this.state,
            ...props
        });
    }
}

const renderModules = (parsers: ILoadedParser[]) => {

    if (!parsers || parsers.length == 0) {
        return "Parsers";
    }

    return (<ul>{parsers.map(p => <li>{p.fileName}</li>)}</ul>)
}

class ParserManager {
    private cacheKey = "cached_parsers";

    private parsers: { fileName: string, parserIds: string[], fileContent: string }[] = [];

    load() {
        const serializedParsers = localStorage.getItem(this.cacheKey);
        if (serializedParsers) {
            this.parsers = JSON.parse(serializedParsers);
            this.parsers.forEach(p => {
                this.appendToDom(p.fileName, p.fileContent);
            });
        }
    }

    save(fileName: string, fileContent: string) {

        const parserListBefore = Object.keys(requestParsers);
        this.appendToDom(fileName, fileContent);

        const parserIds = Object.keys(requestParsers).filter(id => parserListBefore.includes(id));

        this.parsers.push({
            fileName,
            fileContent,
            parserIds,
        });

        localStorage.setItem(this.cacheKey, JSON.stringify(this.parsers));
    }

    remove(id: number) {
        if (!this.parsers[id]) {
            return;
        }

        const existingScript = document.getElementById(this.parsers[id].fileName);
        if (existingScript) {
            existingScript.remove();
        }

        this.parsers[id].parserIds.forEach(pid => {
            delete requestParsers[pid];
        });

        localStorage.setItem(this.cacheKey, JSON.stringify(this.parsers));
    }

    getLoadedParsers(): ILoadedParser[] {
        return this.parsers.map((p, index) => {
            return {
                id: index,
                fileName: p.fileName,
                parserIds: p.parserIds,
            }
        })
    }

    private appendToDom(fileName: string, fileContent: string) {

        const existingScript = document.getElementById(fileName);
        if (existingScript) {
            existingScript.remove();
        }

        const newScript = document.createElement("script");
        newScript.setAttribute("id", fileName);
        newScript.textContent = fileContent;
        document.head.appendChild(newScript);
    }
}

interface ILoadedParser {
    id: number;
    fileName: string;
    parserIds: string[];
}