import { Entry } from "har-format";
import { Component } from "preact";
import { ISearchResult, ISearchSnippet, searchEntry } from "../../services/search-engine";
import { ISearchOptions } from "../search-modal";

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

export class SearchTab extends Component<ISearchTabProps, ISearchTabState> {

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
                class="tab search-tab [--tab-bg:oklch(var(--s))] [--tab-border-color:oklch(var(--s))] text-nowrap"
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

        const totalMatches = this.state.snippets.reduce((sum, s) =>
            sum + s.fragments.reduce((fs, f) =>
                fs + (f.jsonBody ? f.jsonBody.filter(l => l.highlight).length : 1), 0), 0);

        return (
            <div>
                <div class="text-sm opacity-60 mb-3">
                    {totalMatches} match{totalMatches !== 1 ? "es" : ""} in {this.state.snippets.length} location{this.state.snippets.length !== 1 ? "s" : ""} — searching for "<span class="font-semibold text-secondary">{query}</span>"
                </div>
                {this.state.snippets.map((snippet, i) => (
                    <div key={i} class="mb-4">
                        <div class="badge badge-secondary badge-sm mb-1">{snippet.location}</div>
                        {snippet.fragments.map((frag, j) => (
                            frag.jsonBody
                                ? <pre key={j} class="text-sm bg-base-300 rounded px-3 py-2 mb-3 overflow-auto" style="max-height: 60vh"><code>{frag.jsonBody.map((line, k) => (
                                    <div key={k} class={line.highlight ? "bg-secondary/20 -mx-3 px-3" : ""}>
                                        {line.highlight
                                            ? this.renderHighlightedLine(line.text, this.props.searchResult.options)
                                            : line.text}
                                    </div>
                                ))}</code></pre>
                                : <div key={j} class="text-sm font-mono bg-base-300 rounded px-3 py-1.5 mb-1 break-all whitespace-pre-wrap">
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

    private renderHighlightedLine(text: string, options: ISearchOptions) {
        const flags = options.caseSensitive ? "g" : "gi";
        let pattern: RegExp;
        try {
            const source = options.regex ? options.query : options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pattern = new RegExp(source, flags);
        } catch {
            return text;
        }

        const parts: preact.JSX.Element[] = [];
        let lastIndex = 0;
        let m: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((m = pattern.exec(text)) !== null) {
            if (m.index > lastIndex) {
                parts.push(<span>{text.slice(lastIndex, m.index)}</span>);
            }
            parts.push(<mark class="bg-secondary text-secondary-content rounded px-0.5">{m[0]}</mark>);
            lastIndex = m.index + m[0].length;
            if (m[0].length === 0) { pattern.lastIndex++; lastIndex++; }
        }

        if (lastIndex < text.length) {
            parts.push(<span>{text.slice(lastIndex)}</span>);
        }

        return <>{parts}</>;
    }
}
