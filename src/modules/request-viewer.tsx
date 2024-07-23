import { Entry } from "har-format";
import { Component, JSX } from "preact";
import { IConfig, ICustomTabField } from "../config";
import { ResponseTab } from "./tabs/response-tab";
import { getHeadersTab } from "./tabs/headers-tab";

export class RequestViewer extends Component<{ entry: Entry, config: IConfig }> {

    private defaultTabs: ITab[] = [
        { name: "Headers", renderer: getHeadersTab },
        { name: "Payload", renderer: payloadTab },
        { name: "Response", renderer: responseTab },
    ]

    render() {
        if (!this.props.entry.request) {
            return <div>Select request</div>
        }

        const tabs = [
            ...this.defaultTabs
        ];

        const customTabs = Object
            .keys(this.props.config.requestParsers)
            .filter(parserKey => this.props.config.requestParsers[parserKey].isRequestSupported(this.props.entry))
            .map(parserKey => this.props.config.requestParsers[parserKey].getCustomTabs(this.props.entry)).filter(t => !!t);

        customTabs.forEach(ct => {
            tabs.push(...ct.map(tab => {
                return {
                    name: tab.name,
                    renderer: (e: Entry) => {
                        return (<div>
                            {tab.getFields(e).map(f => customTabField(f))}
                        </div>)
                    }
                }
            }))
        })

        let activeTabIndex = tabs.findIndex(t => t.name == lastActiveTab);
        if (activeTabIndex == -1) {
            activeTabIndex = 0;
        }

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {tabs.map((t, i) => getTab(t, this.props.entry, i == activeTabIndex))}
                </div>
            </div>
        )
    }
}

let lastActiveTab: string;

const getTab = (tab: ITab, entry: Entry, isChecked: boolean) =>
    <>
        <input 
            type="radio" 
            name="request_tabs" 
            role="tab" 
            onClick={() => lastActiveTab = tab.name}
            class="tab [--tab-bg:var(--fallback-n,oklch(var(--n)))] [--tab-border-color:var(--fallback-n,oklch(var(--n)))] [--tab-color:var(--fallback-nc,oklch(var(--nc)))] text-nowrap" 
            aria-label={tab.name} 
            checked={isChecked} />
        <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral w-full overflow-hidden">
            {tab.renderer(entry)}
        </div>
    </>

const payloadTab = (entry: Entry) =>
    <>
        <div>Payload</div>
    </>

const responseTab = (entry: Entry) => <ResponseTab entry={entry} />

const customTabField = (field: ICustomTabField) => {
    switch (field.type) {
        case "text":
            return (
                <label class="form-control w-full">
                    <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>
                    <input type="text" placeholder="Type here" class="input input-bordered input-sm w-full" value={field.value} />
                </label>
            );
        case "json":
            return <pre><code>{JSON.stringify(field.value, null, 4)}</code></pre>
    }

    return <></>;
}

interface ITab {
    name: string,
    renderer: { (entry: Entry): JSX.Element }
}