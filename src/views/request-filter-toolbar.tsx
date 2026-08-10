import { Component, createRef } from "preact";
import { IRequestColumnInfo } from "../types/config";
import { IRequestFilter, IRequestViewPreferences, RequestFilterField, RequestFilterOperator } from "../types/workspace";

const fieldLabels: Record<RequestFilterField, string> = {
    status: "Status",
    method: "Method",
    host: "Host",
    mimeType: "MIME type",
    duration: "Duration (ms)",
    size: "Size (bytes)",
    time: "Started time",
};

const operatorLabels: Record<RequestFilterOperator, string> = {
    equals: "is",
    contains: "contains",
    atLeast: "at least",
    atMost: "at most",
    after: "after",
    before: "before",
};

const operatorsByField: Record<RequestFilterField, RequestFilterOperator[]> = {
    status: ["equals"],
    method: ["equals"],
    host: ["contains", "equals"],
    mimeType: ["contains", "equals"],
    duration: ["atLeast", "atMost"],
    size: ["atLeast", "atMost"],
    time: ["after", "before"],
};

interface IRequestFilterToolbarProps {
    preferences: IRequestViewPreferences;
    availableColumns: IRequestColumnInfo[];
    visibleCount: number;
    totalCount: number;
    onPreferencesChange: (preferences: IRequestViewPreferences) => void;
}

interface IRequestFilterToolbarState {
    field: RequestFilterField;
    operator: RequestFilterOperator;
    value: string;
}

export class RequestFilterToolbar extends Component<IRequestFilterToolbarProps, IRequestFilterToolbarState> {
    private filterMenuRef = createRef<HTMLDetailsElement>();
    private columnsMenuRef = createRef<HTMLDetailsElement>();

    constructor(props: IRequestFilterToolbarProps) {
        super(props);
        this.state = { field: "status", operator: "equals", value: "" };
    }

    render() {
        const filters = this.props.preferences.filters;
        return (
            <div class="shrink-0 border-b border-base-content/15 bg-base-100 px-3 py-2">
                <div class="flex min-h-6 flex-wrap items-center gap-2">
                    <label class="flex cursor-pointer items-center gap-2 text-xs font-medium">
                        <input
                            type="checkbox"
                            class="checkbox checkbox-xs"
                            checked={this.props.preferences.showHighlightedRequestsOnly}
                            onChange={() => this.update({ showHighlightedRequestsOnly: !this.props.preferences.showHighlightedRequestsOnly })} />
                        Highlighted only
                    </label>

                    <details ref={this.filterMenuRef} class="dropdown" onToggle={() => { if (this.filterMenuRef.current?.open) this.columnsMenuRef.current?.removeAttribute("open"); }}>
                        <summary class="btn btn-ghost btn-xs">Add filter</summary>
                        <div class="dropdown-content z-[5] mt-2 w-72 border border-base-content/15 bg-neutral p-3 shadow-lg">
                            <div class="grid gap-2">
                                <select
                                    class="select select-bordered select-sm w-full"
                                    aria-label="Filter field"
                                    value={this.state.field}
                                    onChange={event => this.changeField((event.target as HTMLSelectElement).value as RequestFilterField)}>
                                    {Object.entries(fieldLabels).map(([field, label]) => <option value={field}>{label}</option>)}
                                </select>
                                <select
                                    class="select select-bordered select-sm w-full"
                                    aria-label="Filter operator"
                                    value={this.state.operator}
                                    onChange={event => this.setState({ operator: (event.target as HTMLSelectElement).value as RequestFilterOperator })}>
                                    {operatorsByField[this.state.field].map(operator => <option value={operator}>{operatorLabels[operator]}</option>)}
                                </select>
                                {this.renderValueInput()}
                                <button class="btn btn-primary btn-sm" disabled={!this.state.value.trim()} onClick={() => this.addFilter()}>Add</button>
                            </div>
                        </div>
                    </details>

                    <details ref={this.columnsMenuRef} class="dropdown dropdown-end" onToggle={() => { if (this.columnsMenuRef.current?.open) this.filterMenuRef.current?.removeAttribute("open"); }}>
                        <summary class="btn btn-ghost btn-xs">Columns</summary>
                        <div class="dropdown-content z-[5] mt-2 max-h-72 w-56 overflow-auto border border-base-content/15 bg-neutral p-2 shadow-lg">
                            {this.props.availableColumns.map(column => {
                                const id = column.id ?? column.name;
                                const width = this.props.preferences.columnWidths[id] || column.defaultWidth || 120;
                                return (
                                    <label class="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs">
                                        <input
                                            type="checkbox"
                                            class="checkbox checkbox-xs"
                                            checked={!this.props.preferences.hiddenColumns.includes(id)}
                                            onChange={() => this.toggleColumn(id)} />
                                        <span class="min-w-0 flex-1 truncate">{column.name || "Icon"}</span>
                                        <button class="btn btn-ghost btn-xs btn-square" title="Narrow column" aria-label={`Narrow ${column.name || "icon"} column`} onClick={event => { event.preventDefault(); this.setColumnWidth(id, width - 16); }}>-</button>
                                        <button class="btn btn-ghost btn-xs btn-square" title="Widen column" aria-label={`Widen ${column.name || "icon"} column`} onClick={event => { event.preventDefault(); this.setColumnWidth(id, width + 16); }}>+</button>
                                    </label>
                                );
                            })}
                        </div>
                    </details>

                    {this.props.preferences.sort && (
                        <button class="badge badge-outline badge-sm gap-1" onClick={() => this.update({ sort: undefined })} title="Clear sorting">
                            Sort: {this.props.preferences.sort.columnId} {this.props.preferences.sort.direction === "asc" ? "↑" : "↓"} ×
                        </button>
                    )}

                    <span class="ml-auto text-nowrap text-xs tabular-nums opacity-65" aria-live="polite">
                        {this.props.visibleCount} of {this.props.totalCount} requests
                    </span>
                </div>

                {filters.length > 0 && (
                    <div class="mt-2 flex flex-wrap gap-1">
                        {filters.map(filter => (
                            <button class="badge badge-secondary badge-sm gap-1" onClick={() => this.removeFilter(filter.id)} title="Remove filter">
                                {this.getFilterLabel(filter)} ×
                            </button>
                        ))}
                        <button class="btn btn-ghost btn-xs" onClick={() => this.update({ filters: [] })}>Clear</button>
                    </div>
                )}
            </div>
        );
    }

    private renderValueInput() {
        if (this.state.field === "method") {
            return (
                <>
                    <input class="input input-bordered input-sm w-full" aria-label="Filter value" list="http-methods" value={this.state.value} onInput={event => this.setState({ value: (event.target as HTMLInputElement).value.toUpperCase() })} />
                    <datalist id="http-methods">
                        {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"].map(method => <option value={method} />)}
                    </datalist>
                </>
            );
        }

        const type = this.state.field === "time" ? "datetime-local" : (["status", "duration", "size"].includes(this.state.field) ? "number" : "text");
        return <input class="input input-bordered input-sm w-full" aria-label="Filter value" type={type} value={this.state.value} onInput={event => this.setState({ value: (event.target as HTMLInputElement).value })} />;
    }

    private changeField(field: RequestFilterField) {
        this.setState({ field, operator: operatorsByField[field][0], value: "" });
    }

    private addFilter() {
        const filter: IRequestFilter = {
            id: crypto.randomUUID(),
            field: this.state.field,
            operator: this.state.operator,
            value: this.state.value.trim(),
        };
        this.update({ filters: [...this.props.preferences.filters, filter] });
        this.setState({ value: "" });
        this.filterMenuRef.current?.removeAttribute("open");
    }

    private removeFilter(id: string) {
        this.update({ filters: this.props.preferences.filters.filter(filter => filter.id !== id) });
    }

    private toggleColumn(id: string) {
        const hiddenColumns = this.props.preferences.hiddenColumns.includes(id)
            ? this.props.preferences.hiddenColumns.filter(columnId => columnId !== id)
            : [...this.props.preferences.hiddenColumns, id];
        this.update({ hiddenColumns });
    }

    private setColumnWidth(id: string, width: number) {
        this.update({
            columnWidths: {
                ...this.props.preferences.columnWidths,
                [id]: Math.max(40, Math.min(500, width)),
            },
        });
    }

    private update(changes: Partial<IRequestViewPreferences>) {
        this.props.onPreferencesChange({ ...this.props.preferences, ...changes });
    }

    private getFilterLabel(filter: IRequestFilter) {
        return `${fieldLabels[filter.field]} ${operatorLabels[filter.operator]} ${filter.value}`;
    }
}