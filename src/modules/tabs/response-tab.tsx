import { Entry } from "har-format"
import { Component } from "preact"


interface IResponseTabState {
    activeButton: string;
}

export class ResponseTab extends Component<{ entry: Entry }, IResponseTabState> {

    private buttons = [
        { name: "Preview", renderer: getPreview },
        { name: "Raw", renderer: getRaw},
    ];

    constructor() {
        super();

        this.state = {
            activeButton: "Preview"
        }
    }

    onButtonClick(buttonName: string) {
        this.setState({
            activeButton: buttonName
        })
    }

    render() {
        return <>
            <div>{this.buttons.map(b => <button class="btn btn-primary btn-sm mr-2" onClick={() => this.onButtonClick(b.name)} disabled={this.state.activeButton == b.name}>{b.name}</button>)}</div>
            <div class="mt-5">{ this.buttons.find(b => b.name == this.state.activeButton)!.renderer(this.props.entry) }</div>
        </>
    }
}

const getPreview = (entry: Entry) => {

    let content = entry.response.content.text;

    if (content && entry.response.content.mimeType.includes("/json")) {
        content = JSON.stringify(JSON.parse(content), null, 4);
    }

    return <pre><code class="text-wrap overflow-auto">{content}</code></pre>;
}


const getRaw = (entry: Entry) => <pre><code class="text-wrap overflow-auto">{entry.response.content.text}</code></pre>