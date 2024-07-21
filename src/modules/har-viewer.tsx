import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";


export class HarViewer extends Component<{ appState: IAppState }, Entry> {
    render() {
        return (
        <div class="flex w-full">
            <div class="request-list w-1/2 flex-initial">
                <RequestList appState={this.props.appState} onRequestClick={entry => this.setState(entry)} />
            </div>

            <div class="request-details w-1/2 flex-initial">
                <RequestViewer entry={this.state} />
            </div>
        </div>
        )
    }
}