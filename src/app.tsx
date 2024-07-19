import { Component } from "preact"
import { FilePropmt, IUploadedFiles } from "./modules/file-prompt";
import "./app.css"
import { HarViewer } from "./modules/har-viewer";

export class App extends Component<{}, IUploadedFiles> {

    constructor() {
        super();
    }

    render() {
        return this.state.har 
            ? <HarViewer /> 
            : <FilePropmt onFilesSubmitted={ uf => this.setState(uf) } />
    }
}
