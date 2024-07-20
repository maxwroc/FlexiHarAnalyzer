import { Component } from "preact";
import { IUploadedFiles } from "./file-prompt";
import { RequestList } from "./request-list";
import { Entry } from "har-format";
import { RequestViewer } from "./request-viewer";


export class HarViewer extends Component<{ uploadedFiles: IUploadedFiles }, Entry> {
    render() {
        return (
        <div class="flex w-full">
            <div class="request-list w-1/2 flex-initial">
                <RequestList entries={this.props.uploadedFiles.har.log.entries} onRequestClick={entry => this.setState(entry)} />
            </div>

            <div class="request-details w-1/2 flex-initial">
                <RequestViewer entry={this.state} />
            </div>
        </div>
        )
    }
}