import { Entry } from "har-format";
import { Component } from "preact";
import { CustomTab, IConfig, TabField } from "../config";

export class RequestViewer extends Component<{ entry: Entry, config: IConfig }> {
    render() {
        if (!this.props.entry.request) {
            return <div>Select request</div>
        }

        const tabs = Object
            .keys(this.props.config.requestParsers)
            .reduce((acc, parserKey) => {
                const parser = this.props.config.requestParsers[parserKey];

                if (parser.isRequestSupported(this.props.entry)) {
                    const parserTabs = parser.getCustomTabs(this.props.entry);
                    if (parserTabs) {
                        acc.push(...parserTabs);
                    }
                }

                return acc;
            }, [] as CustomTab[]);


        let activeTabIndex = tabs.findIndex(t => t.name == lastActiveTab);
        if (activeTabIndex == -1) {
            activeTabIndex = 0;
        }

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {tabs.map((t, i) => <GenericTab tab={t} entry={this.props.entry} isActive={i == activeTabIndex} onTabClick={() => lastActiveTab = t.name} />)}
                </div>
            </div>
        )
    }
}

let lastActiveTab: string;

interface IGenericTabProps { tab: CustomTab, entry: Entry, isActive: boolean, onTabClick: { (tabName: string): void } }

interface IGenericTabState { fields: TabField[], isRendered: boolean }


class GenericTab extends Component<IGenericTabProps, IGenericTabState> {

    constructor(props: any) {
        super(props);

        this.state = {
            fields: [],
            isRendered: false,
        };
    }

    static getDerivedStateFromProps(props: IGenericTabProps, previousState: IGenericTabState): IGenericTabState | null {

        if (!previousState.isRendered && !props.isActive) {
            // we want to render the tab only if it was shown already or when it is active
            return null;
        }

        return {
            fields: props.tab.getFields(props.entry),
            isRendered: true,
        };
    }

    render() {
        return <>
            <input
                type="radio"
                name="request_tabs"
                role="tab"
                onMouseDown={() => this.onClick()}
                class="tab [--tab-bg:var(--fallback-n,oklch(var(--n)))] [--tab-border-color:var(--fallback-n,oklch(var(--n)))] [--tab-color:var(--fallback-nc,oklch(var(--nc)))] text-nowrap"
                aria-label={this.props.tab.name}
                checked={this.props.isActive} />
            <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral w-full overflow-hidden">
                {this.state.fields.map((f, i) => this.renderField(f, i))}
            </div>
        </>;
    }

    private onClick() {
        this.props.onTabClick(this.props.tab.name);

        if (!this.state.isRendered) {
            this.setState({
                fields: this.props.tab.getFields(this.props.entry),
                isRendered: true,
            });
        }
    }

    private renderField(field: TabField, index: number) {
        switch (field.type) {
            case "header":
                return <h1 class="mb-3">{field.label}</h1>
            case "container":
                switch (field.style) {
                    case "accordeon":
                        return (
                            <div class={"collapse collapse-plus bg-base-100" + (index > 0 ? " mt-5" : "")}>
                                <input type="radio" name="accordeon-field" />
                                <div class="collapse-title text-xl font-medium">{field.label}</div>
                                <div class="collapse-content">
                                    {field.fields.map((f, i) => this.renderField(f, i))}
                                </div>
                            </div>
                        )
                    default:
                        console.error("Container field style not supported");
                }
                break;
            case "text":
                return (
                    <label class="form-control w-full">
                        {field.label && <div class="label">
                            <span class="label-text">{field.label}</span>
                        </div>}
                        <input type="text" class="input input-bordered input-sm w-full" value={field.value} />
                    </label>
                )
            case "large-text":
            case "json":
                const content = field.type == "json" ? JSON.stringify(field.value, null, 4) : field.value;
                return (
                    <label class="form-control w-full">
                        {field.label && <div class="label">
                            <span class="label-text">{field.label}</span>
                        </div>}
                        <textarea class="textarea textarea-bordered h-24 w-full">{content}</textarea>
                    </label>
                )
            case "table":
                return (<>
                    {field.label && <h1 class="mb-3">{field.label}</h1>}
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
                                                <div class="copy-button absolute right-1 top-0 z-[1]">
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
                    </>);
        }

        return <></>
    }
}


const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);