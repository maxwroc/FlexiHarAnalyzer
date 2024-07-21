import { Component } from "preact"
import { FilePropmt, IUploadedFiles } from "./modules/file-prompt";
import "./app.css"
import { HarViewer } from "./modules/har-viewer";
import { defaultConfig, IConfig } from "./config";

export interface IAppState {
    config: IConfig,
    files: IUploadedFiles,
}

export class App extends Component<{}, IAppState> {
    render() {
        return this.state.files 
            ? <HarViewer appState={this.state} /> 
            : <FilePropmt onFilesSubmitted={ uf => this.onLoad(uf) } />
    }

    private onLoad(uploadedFiles: IUploadedFiles) {
        this.setState({
            config: {
                ...defaultConfig
            },
            files: uploadedFiles
        });
    }
}