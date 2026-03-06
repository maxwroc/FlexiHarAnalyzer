import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry, Har } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";
import { IMenuOptions, MenuBar } from "./menu-bar";
import { classNames } from "../components/view-helpers";
import { FileReaderExt } from "../components/file-reader-ext";
import { IHarFile } from "./file-prompt";
import { ISearchResult, searchEntries } from "../components/search-engine";
import { ISearchOptions } from "./search-modal";


interface IHarViewerState { 
    options: IMenuOptions, 
    entry: Entry | undefined, 
    entryIndex: number,
    droppingFile: boolean, 
    har: IHarFile,
    searchResult: ISearchResult | undefined,
    searchPills: ISearchOptions[],
    activeSearchIndex: number,
}

export class HarViewer extends Component<IAppState, IHarViewerState> {

    constructor(props: IAppState) {
        super(props);

        this.state = {
            options: {},
            entry: undefined,
            entryIndex: -1,
            droppingFile: false,
            har: props.har!,
            searchResult: undefined,
            searchPills: [],
            activeSearchIndex: -1,
        }

        updateWindowTitle(this.state.har.name);
    }

    render() {

        const stdClassNames = "request-list w-1/2 overflow-auto pl-3 min-w-0".split(" ");
        const equestListContainerClasses = classNames([...stdClassNames, { "outline-dashed": !!this.state.droppingFile }]);

        console.log("har-view rendering", this.state.har);

        return (
        <div class="flex flex-col w-full" style="height: 100vh">
            <MenuBar 
                onMenuOptionChange={(options) => this.setState({ ...this.state, options })} 
                onSearch={(options) => this.onSearch(options)}
                onPillClick={(index) => this.onPillClick(index)}
                onPillRemove={(index) => this.onPillRemove(index)}
                searchPills={this.state.searchPills}
                activeSearchIndex={this.state.activeSearchIndex}
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
                        menuOptions={this.state.options} 
                        searchResult={this.state.searchResult}
                        onRequestClick={(entry, index) => this.setState({ ...this.state, entry, entryIndex: index })} />
                </div>

                <div class="request-details w-1/2 overflow-auto pl-2 pr-3 min-w-0">
                    <RequestViewer entry={this.state.entry} entryIndex={this.state.entryIndex} parsers={this.props.parsers} searchResult={this.state.searchResult} />
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

    private onSearch(options: ISearchOptions) {
        const result = searchEntries(this.state.har.content.log.entries, options);
        const pills = [...this.state.searchPills, options];
        this.setState({ ...this.state, searchResult: result, searchPills: pills, activeSearchIndex: pills.length - 1 });
    }

    private onPillClick(index: number) {
        const options = this.state.searchPills[index];
        const result = searchEntries(this.state.har.content.log.entries, options);
        this.setState({ ...this.state, searchResult: result, activeSearchIndex: index });
    }

    private onPillRemove(index: number) {
        const pills = this.state.searchPills.filter((_, i) => i !== index);
        const wasActive = index === this.state.activeSearchIndex;

        if (wasActive) {
            // Clear highlights when removing the active search
            this.setState({ ...this.state, searchResult: undefined, searchPills: pills, activeSearchIndex: -1 });
        } else {
            // Adjust active index if a pill before the active one was removed
            const newActive = this.state.activeSearchIndex > index
                ? this.state.activeSearchIndex - 1
                : this.state.activeSearchIndex;
            this.setState({ ...this.state, searchPills: pills, activeSearchIndex: newActive });
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
