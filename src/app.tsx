import "./app.css"
import { Component } from "preact"
import { FilePropmt, IUploadedFiles } from "./views/file-prompt";
import { HarViewer } from "./views/har-viewer";
import { defaultConfig, IConfig, IRequestParser, IRequestParserContext, requestParsers } from "./config";
import { Content } from "har-format";

export interface IAppState {
    config: IConfig;
    parsers: IRequestParser[];
    files: IUploadedFiles;
}

export class App extends Component<{}, IAppState> {
    render() {

        // load previously saved parsers


        return this.state.files 
            ? <HarViewer appState={this.state} /> 
            : <FilePropmt onFilesSubmitted={ uf => this.onLoad(uf) } />
    }

    private onLoad(uploadedFiles: IUploadedFiles) {

        document.title = "HAR Analyzer - " + uploadedFiles.harFileName;

        const initializedParsers: IRequestParser[] = [];

        for (const id in requestParsers) {
            if (Object.prototype.hasOwnProperty.call(requestParsers, id)) {
                initializedParsers.push(requestParsers[id](parserContext));
            }
        }
        requestParsers

        this.setState({
            config: {
                ...defaultConfig
            },
            parsers: initializedParsers,
            files: uploadedFiles
        });
    }
}


const parserContext: IRequestParserContext = {
    getJsonContent: (content: Content) => {
        if (!content.mimeType.includes("application/json") || !content.text) {
            return null;
        }
    
        try {
            let data = content.text;
            if (content.encoding == "base64") {
                data = atob(data);
            }
    
            return JSON.parse(data);
        }
        catch (e) {
            console.error("Failed to parse response", e);
        }
    
        return null;
    }
}