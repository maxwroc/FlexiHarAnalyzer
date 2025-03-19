import "./app.css"
import { Component } from "preact"
import { FilePropmt, IHarFile } from "./views/file-prompt";
import { HarViewer } from "./views/har-viewer";
import { defaultConfig, IConfig, IRequestParser, IRequestParserContext, requestParsers } from "./config";
import { Content } from "har-format";

export interface IAppState {
    config: IConfig;
    parsers: IRequestParser[];
    har: IHarFile | undefined;
}

export class App extends Component<{}, IAppState> {
    render() {
        return this.state.har 
            ? <HarViewer { ...this.state } /> 
            : <FilePropmt onHarFileLoad={ har => this.onLoad(har) } />
    }

    private onLoad(har: IHarFile) {

        document.title = har.name + " - HAR Analyzer";

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
            har: har
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