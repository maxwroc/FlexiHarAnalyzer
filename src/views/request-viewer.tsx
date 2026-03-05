import { Entry } from "har-format";
import { Component, createRef } from "preact";
import { CustomTab, IRequestParser, TabField, TabFieldAccordeon, TabFieldJson } from "../config";
import { ISearchPlugin, JsonViewer, plugins } from "sonj-review";
import { ISearchResult, ISearchSnippet, searchEntry } from "../components/search-engine";

interface IRequestViewerProps {
    entry: Entry | undefined;
    entryIndex: number;
    parsers: IRequestParser[];
    searchResult: ISearchResult | undefined;
}

export class RequestViewer extends Component<IRequestViewerProps> {
    render() {
        const entry = this.props.entry;

        if (!entry || !entry.request) {
            return <div>Select request</div>
        }

        const tabs = this.props.parsers.reduce((acc, parser) => {

                if (parser.isRequestSupported(entry)) {
                    const parserTabs = parser.getCustomTabs(entry);
                    if (parserTabs) {
                        acc.push(...parserTabs.filter(t => !!t));
                    }
                }

                return acc;
            }, [] as CustomTab[]);

        const showSearchTab = this.props.searchResult
            && this.props.entryIndex >= 0
            && this.props.searchResult.matchingIndices.has(this.props.entryIndex);

        // Auto-select Search tab when entry is a search match
        if (showSearchTab) {
            lastActiveTab = "Search";
        }

        // If Search tab was selected but is no longer available, fall back to first tab
        if (!showSearchTab && lastActiveTab === "Search") {
            lastActiveTab = tabs.length > 0 ? tabs[0].name : "";
        }

        let activeTabIndex = tabs.findIndex(t => t.name == lastActiveTab);
        if (activeTabIndex == -1 && lastActiveTab !== "Search") {
            activeTabIndex = 0;
        }

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {showSearchTab && <SearchTab
                        entry={entry}
                        searchResult={this.props.searchResult!}
                        isActive={lastActiveTab === "Search"}
                        onTabClick={() => lastActiveTab = "Search"}
                    />}
                    {tabs.map((t, i) => <GenericTab
                        tab={t}
                        entry={entry}
                        isActive={showSearchTab
                            ? (lastActiveTab === t.name && lastActiveTab !== "Search")
                            : i == activeTabIndex}
                        onTabClick={() => lastActiveTab = t.name}
                    />)}
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
                {this.state.fields.map((f, i) => renderField(f, i))}
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
}


const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);

const renderField = (field: TabField, index: number) => {
    switch (field.type) {
        case "header":
            return <h1 class={index == 0 ? "mb-3" : "my-3"}>{field.label}</h1>
        case "label":
            return <div class="text-sm">{field.label}</div>
        case "container":
            switch (field.style) {
                case "accordeon":
                    return <AccordeonContainerField field={field} fieldIndex={index} />
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
            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <textarea class="textarea textarea-bordered h-24 w-full">{field.value}</textarea>
                </label>
            )
        case "json":
            return (<JsonField field={field} fieldIndex={index} />)
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
        case "link":
            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <a class="px-3" href={field.href}>{field.text || field.href}</a>
                </label>
            )
    }

    return <></>
}

interface IAccordeonContainerFieldState { opened: boolean }

class AccordeonContainerField extends Component<{ field: TabFieldAccordeon, fieldIndex: number }, IAccordeonContainerFieldState> {

    private radioBtn = createRef<HTMLInputElement>();

    componentWillUpdate(_nextProps: any, nextState: IAccordeonContainerFieldState) {
        if (this.radioBtn.current && !this.radioBtn.current.checked) {
            nextState.opened = false;
        }
    }

    onOpen() {
        if (!this.state.opened) {
            this.setState({ opened: true });
        }
    }

    render() {
        return ( 
        <div class={"collapse collapse-plus bg-base-100" + (this.props.fieldIndex > 0 ? " mt-5" : "")}>
            <input type="radio" name="accordeon-field" ref={this.radioBtn} onChange={() => this.onOpen()} />
            <div class="collapse-title text-xl font-medium">{this.props.field.label}</div>
            <div class="collapse-content">
                {this.state.opened && this.props.field.fields.map((f, i) => renderField(f, i))}
            </div>
        </div>
        )
    }
}

class JsonField extends Component<{ field: TabFieldJson, fieldIndex: number }> {

    private listingContainer = createRef<HTMLDivElement>();

    private searchPlugin: ISearchPlugin | undefined;

    componentDidMount() {
        // It is called when the element is added to the DOM for the first time
        this.renderJsonViewer();
    }

    componentDidUpdate() {
        // It is called whenever the existing element is updated
        this.renderJsonViewer();
    }

    render() {   
        return (
            <label class="form-control w-full" for="zonk">
                {this.props.field.label && <div class="label">
                    <span class="label-text">{this.props.field.label}</span>
                </div>}
                {this.props.field.options?.searchEnabled && 
                    <input type="text" class="input input-bordered input-sm w-full" placeholder={"Search string"} onKeyUp={evt => this.onSearchKeyUp(evt)} />}
                <code class="textarea textarea-bordered w-full" ref={this.listingContainer} id="zonk"></code>
            </label>
        )
    }

    private onSearchKeyUp(evt: KeyboardEvent) {
        if (evt.key != "Enter") {
            return;
        }

        this.searchPlugin!.query((evt.currentTarget! as HTMLInputElement).value)
    }

    private renderJsonViewer() {
        const menuItems = plugins.propertyMenu.items!;

        const plug: any[]= [];

        plug.push(plugins.propertyTeaser({ properties: { names: this.props.field.options?.teaserFields || ["email", "upn", "EntityType", "entityType", "Type", "PeopleType", "PeopleSubtype"] } }));
        plug.push(plugins.truncate({ maxNameLength: 0, maxValueLength: 80 }));
        plug.push(plugins.propertyMenu([
            menuItems.copyName,
            menuItems.copyValue,
            menuItems.copyFormattedValue,
            menuItems.parseJsonValue,
        ]));

        if (this.props.field.options?.searchEnabled) {
            this.searchPlugin = plugins.search(this.props.field.value);
            plug.push(this.searchPlugin)
        }

        plug.push(plugins.autoExpand(this.props.field.options && this.props.field.options.autoExpand != undefined ? this.props.field.options.autoExpand : 2 ));

        // clean up the previous one
        this.listingContainer.current!.innerHTML = "";

        new JsonViewer(this.props.field.value, "Object", plug).render(this.listingContainer.current!);
    }
}


// ---- Search tab (lazy per-entry search) ----

interface ISearchTabProps {
    entry: Entry;
    searchResult: ISearchResult;
    isActive: boolean;
    onTabClick: () => void;
}

interface ISearchTabState {
    snippets: ISearchSnippet[] | null;
    computedForEntry: Entry | null;
}

class SearchTab extends Component<ISearchTabProps, ISearchTabState> {

    constructor(props: ISearchTabProps) {
        super(props);
        this.state = { snippets: null, computedForEntry: null };
    }

    componentDidMount() {
        if (this.props.isActive) {
            this.computeSnippets();
        }
    }

    componentDidUpdate(prevProps: ISearchTabProps) {
        // Recompute when entry changes or when the tab becomes active
        if (this.props.isActive && (
            this.state.computedForEntry !== this.props.entry ||
            prevProps.searchResult !== this.props.searchResult
        )) {
            this.computeSnippets();
        }
    }

    private computeSnippets() {
        const snippets = searchEntry(this.props.entry, this.props.searchResult.options);
        this.setState({ snippets, computedForEntry: this.props.entry });
    }

    render() {
        return <>
            <input
                type="radio"
                name="request_tabs"
                role="tab"
                onMouseDown={() => this.onActivate()}
                class="tab [--tab-bg:oklch(var(--s))] [--tab-border-color:oklch(var(--s))] [--tab-color:oklch(var(--sc))] text-nowrap"
                aria-label="Search"
                checked={this.props.isActive} />
            <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral w-full overflow-auto" style="max-height: calc(100vh - 130px)">
                {this.renderContent()}
            </div>
        </>;
    }

    private onActivate() {
        this.props.onTabClick();
        if (this.state.computedForEntry !== this.props.entry) {
            this.computeSnippets();
        }
    }

    private renderContent() {
        if (!this.state.snippets) {
            return <div class="text-sm opacity-60">Computing results…</div>;
        }

        if (this.state.snippets.length === 0) {
            return <div class="text-sm opacity-60">No matches found in this entry.</div>;
        }

        const query = this.props.searchResult.options.query;

        return (
            <div>
                <div class="text-sm opacity-60 mb-3">
                    Found in {this.state.snippets.length} location{this.state.snippets.length !== 1 ? "s" : ""} — searching for "<span class="font-semibold text-secondary">{query}</span>"
                </div>
                {this.state.snippets.map((snippet, i) => (
                    <div key={i} class="mb-4">
                        <div class="badge badge-secondary badge-sm mb-1">{snippet.location}</div>
                        {snippet.fragments.map((frag, j) => (
                            <div key={j} class="text-sm font-mono bg-base-300 rounded px-3 py-1.5 mb-1 break-all whitespace-pre-wrap">
                                <span class="opacity-70">{frag.before}</span>
                                <mark class="bg-secondary text-secondary-content rounded px-0.5">{frag.match}</mark>
                                <span class="opacity-70">{frag.after}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
}