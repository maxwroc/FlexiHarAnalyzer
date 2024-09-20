import { Component } from "preact";
import { RequestList } from "./request-list";
import { Entry } from "har-format";
import { RequestViewer } from "./request-viewer";
import { IAppState } from "../app";
import { IMenuOptions, MenuBar } from "./menu-bar";

export class HarViewer extends Component<{ appState: IAppState }, { options: IMenuOptions, entry: Entry }> {
    render() {
        return (
        <>
        <div class="flex flex-col w-full" style="height: 100vh">
            <MenuBar onMenuOptionChange={(options) => this.setState({ ...this.state, options })} fileName={this.props.appState.files.harFileName} />
            <div class="h-full relative mt-3">
                <div class="request-list w-1/2 absolute inset-y-0 overflow-auto pl-3">
                    <RequestList appState={this.props.appState} menuOptions={this.state.options} onRequestClick={entry => this.setState({ ...this.state, entry })} />
                </div>

                <div class="request-details w-1/2 absolute inset-y-0 left-2/4 px-3">
                    <RequestViewer entry={this.state.entry} config={this.props.appState.config} />
                </div>
            </div>
        </div>
        </>
        )
    }
}