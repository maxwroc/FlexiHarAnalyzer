import { Component } from "preact";

export interface ISearchOptions {
    query: string;
    request: {
        url: boolean;
        headers: boolean;
        body: boolean;
    };
    response: {
        headers: boolean;
        body: boolean;
    };
    caseSensitive: boolean;
    regex: boolean;
}

interface ISearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (options: ISearchOptions) => void;
}

interface ISearchModalState extends ISearchOptions {}

export class SearchModal extends Component<ISearchModalProps, ISearchModalState> {

    constructor(props: ISearchModalProps) {
        super(props);
        this.state = {
            query: "",
            request: { url: true, headers: false, body: true },
            response: { headers: false, body: true },
            caseSensitive: false,
            regex: false,
        };
    }

    componentDidUpdate(prevProps: ISearchModalProps) {
        if (this.props.isOpen && !prevProps.isOpen) {
            // Focus the search input when modal opens
            setTimeout(() => {
                const input = document.getElementById("search-input") as HTMLInputElement;
                input?.focus();
            }, 50);
        }
    }

    private handleSearch = () => {
        if (!this.state.query.trim()) return;
        this.props.onSearch({ ...this.state });
    };

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            this.handleSearch();
        } else if (e.key === "Escape") {
            this.props.onClose();
        }
    };

    private toggleField<S extends "request" | "response">(section: S, field: keyof ISearchOptions[S]) {
        this.setState({
            [section]: {
                ...this.state[section],
                [field]: !this.state[section][field],
            },
        } as Pick<ISearchModalState, S>);
    }

    render() {
        if (!this.props.isOpen) return null;

        return (
            <div class="modal modal-open" onMouseDown={(e) => { if (e.target === e.currentTarget) this.props.onClose(); }}>
                <div class="modal-box w-11/12 max-w-lg" onKeyDown={this.handleKeyDown}>
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={this.props.onClose}>✕</button>
                    <h3 class="font-bold text-lg mb-4">Search</h3>

                    {/* Search input */}
                    <div class="form-control mb-4">
                        <div class="join w-full">
                            <input
                                id="search-input"
                                type="text"
                                placeholder="Search text…"
                                autocomplete="off"
                                class="input input-bordered join-item w-full"
                                value={this.state.query}
                                onInput={(e) => this.setState({ query: (e.target as HTMLInputElement).value })}
                            />
                            <button class="btn btn-primary join-item" onClick={this.handleSearch}>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Options row: case sensitive & regex */}
                    <div class="flex gap-4 mb-4">
                        <label class="label cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm"
                                checked={this.state.caseSensitive}
                                onChange={() => this.setState({ caseSensitive: !this.state.caseSensitive })}
                            />
                            <span class="label-text">Case sensitive</span>
                        </label>
                        <label class="label cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm"
                                checked={this.state.regex}
                                onChange={() => this.setState({ regex: !this.state.regex })}
                            />
                            <span class="label-text">Regex</span>
                        </label>
                    </div>

                    <div class="divider my-1"></div>

                    {/* Request fields */}
                    <div class="mb-2">
                        <div class="text-sm font-semibold mb-2 opacity-70">Request</div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1">
                            {this.renderCheckbox("request", "url", "URL")}
                            {this.renderCheckbox("request", "headers", "Headers")}
                            {this.renderCheckbox("request", "body", "Body")}
                        </div>
                    </div>

                    <div class="divider my-1"></div>

                    {/* Response fields */}
                    <div class="mb-2">
                        <div class="text-sm font-semibold mb-2 opacity-70">Response</div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1">
                            {this.renderCheckbox("response", "headers", "Headers")}
                            {this.renderCheckbox("response", "body", "Body")}
                        </div>
                    </div>

                    {/* Actions */}
                    <div class="modal-action">
                        <button class="btn btn-ghost" onClick={this.props.onClose}>Cancel</button>
                        <button class="btn btn-primary" onClick={this.handleSearch} disabled={!this.state.query.trim()}>Search</button>
                    </div>
                </div>
            </div>
        );
    }

    private renderCheckbox<S extends "request" | "response">(section: S, field: keyof ISearchOptions[S], label: string) {
        return (
            <label class="label cursor-pointer justify-start gap-2">
                <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={this.state[section][field] as boolean}
                    onChange={() => this.toggleField(section, field)}
                />
                <span class="label-text">{label}</span>
            </label>
        );
    }
}
