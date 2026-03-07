import { Entry } from "har-format";
import { Component, createRef } from "preact";
import { ISearchResult, ISearchSnippet, searchEntry } from "../../services/search-engine";
import { ISearchOptions } from "../search-modal";

const CURRENT_MATCH_CLASS = "search-current-match";

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

        return (
            <div>
                <div class="text-sm opacity-60 mb-3">
                    Found in {this.state.snippets.length} location{this.state.snippets.length !== 1 ? "s" : ""} — searching for "<span class="font-semibold text-secondary">{query}</span>"
                </div>
                {this.state.snippets.map((snippet, i) => (
                    <div key={i} class="mb-4">
                        {snippet.fragments.map((frag, j) => (
                            frag.jsonBody
                                ? <JsonMatchContainer key={j} location={snippet.location} jsonBody={frag.jsonBody} options={this.props.searchResult.options} />
                                : <div key={j} class="mb-1">
                                    <span class="inline-block bg-secondary text-secondary-content text-xs font-medium px-2 py-0.5 rounded-t">{snippet.location}</span>
                                    <div class="text-sm font-mono bg-base-300 rounded-b rounded-tr px-3 py-1.5 break-all whitespace-pre-wrap border-2 border-secondary">
                                        <span class="opacity-70">{frag.before}</span>
                                        <mark class="bg-secondary text-secondary-content rounded px-0.5">{frag.match}</mark>
                                        <span class="opacity-70">{frag.after}</span>
                                    </div>
                                </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

}

function renderHighlightedLine(text: string, options: ISearchOptions) {
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

interface IJsonMatchContainerProps {
    location: string;
    jsonBody: Array<{ text: string; highlight: boolean }>;
    options: ISearchOptions;
}

interface IJsonMatchContainerState {
    currentIndex: number;
    totalMarks: number;
}

class JsonMatchContainer extends Component<IJsonMatchContainerProps, IJsonMatchContainerState> {

    private preRef = createRef<HTMLPreElement>();

    state: IJsonMatchContainerState = { currentIndex: 0, totalMarks: 0 };

    componentDidMount() {
        this.countMarks();
    }

    componentDidUpdate(prevProps: IJsonMatchContainerProps) {
        if (prevProps.jsonBody !== this.props.jsonBody) {
            this.countMarks();
        }
    }

    private countMarks() {
        const total = this.preRef.current?.querySelectorAll("mark").length || 0;
        if (total !== this.state.totalMarks) {
            this.setState({ totalMarks: total, currentIndex: 0 });
        }
    }

    private scrollToMark(index: number) {
        const pre = this.preRef.current;
        if (!pre) return;

        const marks = pre.querySelectorAll("mark");
        pre.querySelector(`.${CURRENT_MATCH_CLASS}`)?.classList.remove(CURRENT_MATCH_CLASS);

        const target = marks[index];
        if (!target) return;

        const line = target.closest("tr");
        if (line) line.classList.add(CURRENT_MATCH_CLASS);

        const preRect = pre.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        pre.scrollTop += targetRect.top - preRect.top - preRect.height / 2 + targetRect.height / 2;
    }

    private navigate(direction: number) {
        const total = this.state.totalMarks;
        if (total <= 1) return;
        const next = (this.state.currentIndex + direction + total) % total;
        this.setState({ currentIndex: next }, () => this.scrollToMark(next));
    }

    render() {
        return (
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <span class="inline-block bg-secondary text-secondary-content text-xs font-medium px-2 py-0.5 rounded-t">{this.props.location}</span>
                    {this.state.totalMarks > 1 && (
                        <div class="flex items-center gap-1">
                            <span class="text-xs opacity-50 whitespace-nowrap">{this.state.currentIndex + 1}/{this.state.totalMarks}</span>
                            <button class="btn btn-ghost btn-xs btn-square" title="Previous match" onClick={() => this.navigate(-1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button class="btn btn-ghost btn-xs btn-square" title="Next match" onClick={() => this.navigate(1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                <pre ref={this.preRef} class="text-sm bg-base-300 rounded-b rounded-tr py-2 overflow-auto border-2 border-secondary" style="max-height: 60vh">
                    <code><table class="border-collapse w-full">{this.props.jsonBody.map((line, k) => (
                        <tr key={k} class={line.highlight ? "search-highlight-line" : ""}>
                            <td class="select-none text-right pr-3 pl-3 opacity-30 align-top" style="width: 1px; white-space: nowrap">{k + 1}</td>
                            <td class="pr-3">{line.highlight
                                ? renderHighlightedLine(line.text, this.props.options)
                                : line.text}</td>
                        </tr>
                    ))}</table></code>
                </pre>
            </div>
        );
    }
}
