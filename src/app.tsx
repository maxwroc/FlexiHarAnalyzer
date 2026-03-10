import "./app.css"
import { Component } from "preact"
import { FilePrompt } from "./views/file-prompt";
import { IHarFile } from "./types/har-file";
import { HarViewer } from "./views/har-viewer";
import { defaultConfig, IConfig, IRequestParser, IRequestParserContext } from "./types/config";
import "./parsers/generic-parser";
import "./parsers/image-parser";
import { Content } from "har-format";
import { ParserManager } from "./services/parser-manager";

export interface IAppState {
    config: IConfig;
    parsers: IRequestParser[];
    har: IHarFile | undefined;
    returnedHar?: IHarFile;
}

export class App extends Component<{}, IAppState> {

    private parserManager = new ParserManager();

    render() {
        return this.state.har 
            ? <HarViewer { ...this.state } onGoBack={ har => this.onGoBack(har) } /> 
            : <FilePrompt onHarFileLoad={ har => this.onLoad(har) } initialHar={this.state.returnedHar} />
    }

    private onLoad(har: IHarFile) {
        this.setState({
            config: {
                ...defaultConfig
            },
            parsers: this.parserManager.initializeParsers(parserContext),
            har: har,
            returnedHar: undefined,
        });
    }

    private onGoBack(har: IHarFile) {
        this.setState({
            ...this.state,
            har: undefined,
            returnedHar: har,
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