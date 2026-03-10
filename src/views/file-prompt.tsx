import { Har } from "har-format";
import { Component } from "preact";
import { classNames } from "../utils/view-helpers";
import { FileReaderExt } from "../services/file-reader";
import { IHarFile } from "../types/har-file";
import { ParserList } from "./parser-list";

export interface IFilePromptProps {
    onHarFileLoad: { (har: IHarFile): void };
    initialHar?: IHarFile;
}

interface IFilePromptState {
    harHighlight?: boolean;
    harFile?: FileReaderExt<Har>;
    loadedHar?: IHarFile;
}


export class FilePrompt extends Component<IFilePromptProps, IFilePromptState> {

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
                        <ParserList />
                    </div>
                    <div class="flex justify-end mt-5">
                        <button class="btn btn-primary" onClick={()=> this.onSubmit()} disabled={!harFileName}>Load files</button>
                    </div>
                </div>
            </div>
        </div>
        )
    }

    private async onSubmit() {

        if (this.state.loadedHar) {
            this.props.onHarFileLoad(this.state.loadedHar);
            return;
        }

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
