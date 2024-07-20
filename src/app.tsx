import { Component } from "preact"
import { FilePropmt, IUploadedFiles } from "./modules/file-prompt";
import "./app.css"
import { HarViewer } from "./modules/har-viewer";

export class App extends Component<{}, IUploadedFiles> {
    render() {
        return this.state.har 
            ? <HarViewer uploadedFiles={this.state} /> 
            : <FilePropmt onFilesSubmitted={ uf => this.setState(uf) } />
    }
}