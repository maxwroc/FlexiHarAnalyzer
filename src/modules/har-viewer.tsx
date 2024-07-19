import { Component } from "preact";


export class HarViewer extends Component {
    render() {
        return (
        <div class="flex w-full">
            <div class="request-list w-1/2 flex-initial border-solid border-2 border-sky-500">
            </div>

            <div class="request-details w-1/2 flex-initial">
            </div>
        </div>
        )
    }
}