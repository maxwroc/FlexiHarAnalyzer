import { Component } from "preact";
import { IParserError, parserErrorStore } from "../services/parser-error-store";

interface IGroupedError {
    parserId: string;
    fnName: string;
    message: string;
    stack: string;
    count: number;
}

interface IParserErrorToastState {
    errors: IParserError[];
    expandedKey: string | null;
}

function groupErrors(errors: IParserError[]): IGroupedError[] {
    const map = new Map<string, IGroupedError>();
    for (const err of errors) {
        const key = `${err.parserId}\0${err.fnName}\0${err.message}`;
        const existing = map.get(key);
        if (existing) {
            existing.count++;
            existing.stack = err.stack; // keep latest stack
        } else {
            map.set(key, { ...err, count: 1 });
        }
    }
    return Array.from(map.values());
}

export class ParserErrorToast extends Component<{}, IParserErrorToastState> {

    private unsubscribe?: () => void;

    constructor(props: {}) {
        super(props);
        this.state = { errors: [], expandedKey: null };
    }

    componentDidMount() {
        this.unsubscribe = parserErrorStore.subscribe(errors => {
            this.setState({ errors: [...errors], expandedKey: null });
        });
    }

    componentWillUnmount() {
        this.unsubscribe?.();
    }

    render() {
        if (this.state.errors.length === 0) return null;

        const grouped = groupErrors(this.state.errors);

        return (
            <div class="toast toast-end toast-bottom z-50" style="max-width: 36rem; width: 36rem;">
                <div class="flex flex-col bg-error text-error-content rounded-xl shadow-lg" style="max-height: 60vh;">
                    {/* Fixed header */}
                    <div class="flex items-center justify-between px-4 py-2 border-b border-error-content/20 shrink-0">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span class="font-bold text-sm">Parser errors ({this.state.errors.length})</span>
                        </div>
                        <button class="btn btn-ghost btn-xs btn-circle" onClick={() => parserErrorStore.clear()}>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Scrollable error list */}
                    <div class="overflow-y-auto px-4 py-2 flex flex-col gap-2">
                        {grouped.map(err => {
                            const key = `${err.parserId}\0${err.fnName}\0${err.message}`;
                            const isExpanded = this.state.expandedKey === key;
                            return (
                                <div key={key} class="text-sm">
                                    <div
                                        class="cursor-pointer flex items-start gap-2"
                                        onClick={() => this.setState({ expandedKey: isExpanded ? null : key })}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class={`h-4 w-4 mt-0.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-1 flex-wrap">
                                                <span class="font-semibold">{err.parserId}</span>
                                                <span class="opacity-70">&rarr; {err.fnName}()</span>
                                                {err.count > 1 && (
                                                    <span class="badge badge-sm badge-neutral">&times;{err.count}</span>
                                                )}
                                            </div>
                                            <p class="opacity-80 break-words">{err.message}</p>
                                        </div>
                                    </div>
                                    {isExpanded && err.stack && (
                                        <pre class="text-xs mt-1 ml-6 p-2 bg-black/20 rounded overflow-x-auto whitespace-pre-wrap">{err.stack}</pre>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
}
