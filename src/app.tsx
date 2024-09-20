import "./app.css"
import { Component } from "preact"
import { FilePropmt, IUploadedFiles } from "./components/file-prompt";
import { HarViewer } from "./components/har-viewer";
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

        document.title = "HAR Analyzer - " + uploadedFiles.harFileName;

        this.setState({
            config: {
                ...defaultConfig
            },
            files: uploadedFiles
        });
    }
}