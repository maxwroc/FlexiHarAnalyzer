import { Component } from "preact";
import { ISearchOptions, SearchModal } from "./search-modal";

interface IMenuBarState extends IMenuOptions {
    searchOpen: boolean;
}

export class MenuBar extends Component<IMenuBarProps, IMenuBarState> {

    onChange(state: IMenuBarState) {
        this.setState(state);
        this.props.onMenuOptionChange(state);
    }

    private onSearch = (options: ISearchOptions) => {
        this.setState({ searchOpen: false });
        this.props.onSearch(options);
    };

    render() {
        return <div class="navbar bg-neutral">
            <div class="navbar-start">
                <div class="dropdown">
                    <div tabindex={0} role="button" class="btn btn-ghost btn-circle">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </div>
                    <ul
                        tabindex={0}
                        class="menu menu-sm dropdown-content bg-neutral rounded-box z-[1] mt-3 p-2 shadow">
                        <li><label class="text-nowrap"><input type="checkbox" checked={this.state.showHighlightedRequestsOnly} class="checkbox checkbox-xs" onClick={() => this.onChange({...this.state, showHighlightedRequestsOnly: !this.state.showHighlightedRequestsOnly})} />Show highlighted requests only</label></li>
                    </ul>
                </div>
            </div>
            <div class="navbar-center">
                <a class="btn btn-ghost text-xl">HAR analyzer{ this.props.fileName ? " - " + this.props.fileName : "" }</a>
            </div>
            <div class="navbar-end">
                {this.props.searchPills.map((pill, i) => (
                    <div
                        key={i}
                        class={`badge gap-1 cursor-pointer ml-1 select-none ${i === this.props.activeSearchIndex ? "badge-secondary" : "badge-outline"}`}
                        onClick={() => this.props.onPillClick(i)}
                        title={pill.query}
                    >
                        <span class="max-w-[100px] truncate text-xs">{pill.query}</span>
                        <button
                            class="btn btn-ghost btn-circle p-0"
                            style="min-height:0;height:14px;width:14px;"
                            onClick={(e) => { e.stopPropagation(); this.props.onPillRemove(i); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
                <button class="btn btn-ghost btn-circle" id="search-button" onClick={() => this.setState({ searchOpen: true })}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <SearchModal
                    isOpen={!!this.state.searchOpen}
                    onClose={() => this.setState({ searchOpen: false })}
                    onSearch={this.onSearch}
                />
            </div>
        </div>
    }
}

interface IMenuBarProps { 
    onMenuOptionChange: { (options: IMenuOptions): void };
    onSearch: { (options: ISearchOptions): void };
    onPillClick: { (index: number): void };
    onPillRemove: { (index: number): void };
    searchPills: ISearchOptions[];
    activeSearchIndex: number;
    fileName: string;
}

export interface IMenuOptions {
    showHighlightedRequestsOnly?: boolean;
}