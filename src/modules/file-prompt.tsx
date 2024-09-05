import { Har } from "har-format";
import { Component } from "preact";
import { classNames } from "../utilities";

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
}


export class FilePropmt extends Component<IFilePromptProps, IFilePromptState> {

    private harFile: File | undefined = undefined;

    constructor() {
        super();

        this.state = {
            harHighlight: false,
            moduleHighlight: false
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
                            class={moduleClassNames}>Module</div>
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

        this.overwriteStateProps({ harFileName: e.dataTransfer.files[0].name })

        this.harFile = e.dataTransfer.files[0];

        return false;
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