import { Entry } from "har-format";
import { Component } from "preact";


interface IRequestDetails {

}


export class Request extends Component<{}, IRequestDetails> {

    constructor(private entry: Entry) {
        super();
        this.state = {};
    }

    render() {
        return <div></div>
    }
}