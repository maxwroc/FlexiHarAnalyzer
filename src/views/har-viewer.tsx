import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry, Har } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";
import { IMenuOptions, MenuBar } from "./menu-bar";
import { classNames } from "../components/view-helpers";
import { FileReaderExt } from "../components/file-reader-ext";
import { IHarFile } from "./file-prompt";


interface IHarViewerState { 
    options: IMenuOptions, 
    entry: Entry | undefined, 
    droppingFile: boolean, 
    har: IHarFile,
}

export class HarViewer extends Component<IAppState, IHarViewerState> {

    constructor(props: IAppState) {
        super(props);

        this.state = {
            options: {},
            entry: undefined,
            droppingFile: false,
            har: props.har!,
        }

        updateWindowTitle(this.state.har.name);
    }

    render() {

        const stdClassNames = "request-list w-1/2 absolute inset-y-0 overflow-auto ml-3".split(" ");
        const equestListContainerClasses = classNames([...stdClassNames, { "outline-dashed": !!this.state.droppingFile }]);

        console.log("har-view rendering", this.state.har);

        return (
        <div class="flex flex-col w-full" style="height: 100vh">
            <MenuBar onMenuOptionChange={(options) => this.setState({ ...this.state, options })} fileName={this.state.har.name} />
            <div class="h-full relative mt-3">
                <div 
                    class={equestListContainerClasses}
                    onDragOver={ e => this.onDragOver(e) } 
                    onDragLeave={ () => this.onDragLeave() } 
                    onDrop={e => this.onHarFileDrop(e)}>
                    <RequestList 
                        config={this.props.config} 
                        har={this.state.har} 
                        parsers={this.props.parsers} 
                        menuOptions={this.state.options} 
                        onRequestClick={entry => this.setState({ ...this.state, entry })} />
                </div>

                <div class="request-details w-1/2 absolute inset-y-0 left-2/4 pl-6 pr-3">
                    <RequestViewer entry={this.state.entry} parsers={this.props.parsers} />
                </div>
            </div>
        </div>
        )
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

    private async onHarFileDrop(e: DragEvent) {
        
        e.preventDefault();

        // removing overlay
        this.onDragLeave();
        
        if (!e.dataTransfer || !e.dataTransfer.files) {
            return;
        }

        const file = new FileReaderExt<Har>(e.dataTransfer.files[0]);

        const harFile = await file.getJson();
        if (harFile) {
            const newHar = {
                name: file.name,
                content: harFile,
            }

            updateWindowTitle(file.name);

            this.setState({ ...this.state, har: newHar });
        }
        else {
            console.warn("File failed to parse");
        }
    }
}

const updateWindowTitle = (harFileName: string) => document.title = harFileName + " - Har Analyser";