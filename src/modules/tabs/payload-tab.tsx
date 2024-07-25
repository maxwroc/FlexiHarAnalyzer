import { Entry } from "har-format";
import { Component } from "preact";



export class PayloadTab extends Component<{ entry: Entry }> {

    render() {
        return <>
            <div>Query string</div>
            <div class="mt-5">Post data</div>
        </>
    }
}