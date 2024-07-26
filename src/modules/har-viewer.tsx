import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";
import { MenuBar } from "./menu-bar";


export class HarViewer extends Component<{ appState: IAppState }, Entry> {
    render() {
        return (
        <>
        <div class="flex flex-col w-full" style="height: 100vh">
            <MenuBar />
            <div class="h-full relative mt-3">
                <div class="request-list w-1/2 absolute inset-y-0 overflow-auto pl-3">
                    <RequestList appState={this.props.appState} onRequestClick={entry => this.setState(entry)} />
                </div>

                <div class="request-details w-1/2 absolute inset-y-0 left-2/4 px-3">
                    <RequestViewer entry={this.state} config={this.props.appState.config} />
                </div>
            </div>
        </div>
        </>
        )
    }
}