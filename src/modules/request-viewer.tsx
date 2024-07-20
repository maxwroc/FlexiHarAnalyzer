import { Entry } from "har-format";
import { Component, JSX } from "preact";

export class RequestViewer extends Component<{ entry: Entry }> {

    private tabs: ITab[] = [
        { name: "Headers", renderer: headersTab },
        { name: "Payload", renderer: payloadTab },
        { name: "Preview", renderer: previewTab },
        { name: "Response", renderer: responseTab },
    ]

    render() {
        if (!this.props.entry.request) {
            return <div>Select request</div>
        }

        console.log("entry", this.props.entry)

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {this.tabs.map((t,i) => getTab(t, this.props.entry, i == 0))}
                </div>
            </div>
        )
    }
}

const getTab = (tab: ITab, entry: Entry, isChecked: boolean) => 
    <>
    <input type="radio" name="request_tabs" role="tab" class="tab [--tab-bg:var(--fallback-n,oklch(var(--n)))] [--tab-border-color:var(--fallback-n,oklch(var(--n)))] [--tab-color:var(--fallback-nc,oklch(var(--nc)))]" aria-label={tab.name} checked={isChecked} />
    <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral">
        {tab.renderer(entry)}
    </div>
    </>

const headersTab = (entry: Entry) => 
    <>
    <pre>{entry.request.url}</pre>
    </>

const payloadTab = (entry: Entry) => 
    <>
    <div>Payload</div>
    </>

const previewTab = (entry: Entry) => 
    <>
    <div>preview</div>
    </>

const responseTab = (entry: Entry) => 
    <>
    <div>Response</div>
    </>

interface ITab {
    name: string,
    renderer: { (entry: Entry): JSX.Element }
}