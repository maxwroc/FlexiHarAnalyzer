import { Entry } from "har-format";
import { Component, JSX } from "preact";
import { CustomTab, IConfig, ICustomTab, ICustomTabField, TabField } from "../config";
import { ResponseTab } from "./tabs/response-tab";
import { getHeadersTab } from "./tabs/headers-tab";
import { PayloadTab } from "./tabs/payload-tab";

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

const payloadTab = (entry: Entry) => <PayloadTab entry={entry} />

const responseTab = (entry: Entry) => <ResponseTab entry={entry} />

const customTabField = (field: ICustomTabField) => {
    switch (field.type) {
        case "text":
            return (
                <label class="form-control w-full">
                    <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>
                    <input type="text" class="input input-bordered input-sm w-full" value={field.value} />
                </label>
            );
        case "json":
            return (

                <label class="form-control w-full">
                    <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>
                    <textarea class="textarea textarea-bordered h-24 w-full">{JSON.stringify(field.value, null, 4)}</textarea>
                </label>
            )
    }

    return <></>;
}

interface ITab {
    name: string,
    renderer: { (entry: Entry): JSX.Element }
}

class GenericTab extends Component<{ tab: CustomTab, entry: Entry, isActive: boolean, onTabClick: { (tabName: string): void } }, { fields: TabField[] }> {

    private isRendered = false;

    constructor() {
        super();

        this.state = {
            fields: []
        };
    }

    render() {
        return <>
            <input
                type="radio"
                name="request_tabs"
                role="tab"
                onClick={() => this.onClick()}
                class="tab [--tab-bg:var(--fallback-n,oklch(var(--n)))] [--tab-border-color:var(--fallback-n,oklch(var(--n)))] [--tab-color:var(--fallback-nc,oklch(var(--nc)))] text-nowrap"
                aria-label={this.props.tab.name}
                checked={this.props.isActive} />
            <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral w-full overflow-hidden">
                {this.state.fields.map(f => this.renderField(f))}
            </div>
        </>;
    }

    private onClick() {
        this.props.onTabClick(this.props.tab.name);

        if (!this.isRendered) {
            this.setState({
                fields: this.props.tab.getFields(this.props.entry)
            });

            this.isRendered = true;
        }
    }

    private renderField(field: TabField) {
        switch (field.type) {
            case "container":
                break;
            case "text":
                return (
                    <label class="form-control w-full">
                        <div class="label">
                            <span class="label-text">{field.label}</span>
                        </div>
                        <input type="text" class="input input-bordered input-sm w-full" value={field.value} />
                    </label>
                )
            case "large-text":
            case "json":
                const content = field.type == "json" ? JSON.stringify(field.value, null, 4) : field.value;
                return (
                    <label class="form-control w-full">
                        <div class="label">
                            <span class="label-text">{field.label}</span>
                        </div>
                        <textarea class="textarea textarea-bordered h-24 w-full">{content}</textarea>
                    </label>
                )
            case "table":
                return (
                    <table className="table table-xs">
                        <thead>
                            <tr>
                                {field.headers.map(h => {
                                    
                                    return <th style={h.width ? "width: " + h.width + "px" : ""}>{h.name}</th>
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {field.values.map(value => (
                                <tr>
                                    {field.headers.map(header => (
                                        <td class="truncate text-nowrap hover:text-wrap relative">
                                            {header.copyButton && (
                                                <div class="copy-button absolute right-3 top-1 z-[1]">
                                                    <button class="btn btn-xs btn-square btn-neutral cursor-copy" aria-label="copy" onClick={() => copyToClipboard(value[header.key])}>
                                                        <svg class="fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                                            <path d="M 16 3 C 14.742188 3 13.847656 3.890625 13.40625 5 L 6 5 L 6 28 L 26 28 L 26 5 L 18.59375 5 C 18.152344 3.890625 17.257813 3 16 3 Z M 16 5 C 16.554688 5 17 5.445313 17 6 L 17 7 L 20 7 L 20 9 L 12 9 L 12 7 L 15 7 L 15 6 C 15 5.445313 15.445313 5 16 5 Z M 8 7 L 10 7 L 10 11 L 22 11 L 22 7 L 24 7 L 24 26 L 8 26 Z"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                            {value[header.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
        }

        return <></>
    }
}


const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);