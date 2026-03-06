import { Entry } from "har-format";
import { Component, createRef } from "preact";
import { IConfig, IRequestColumnInfo, IRequestParser } from "../types/config";
import { classNames } from "../utils/view-helpers";
import { IMenuOptions } from "./menu-bar";
import memoize from "memoize-one";
import { IHarFile } from "./file-prompt";
import { ISearchResult } from "../services/search-engine";

const columnId = (col: IRequestColumnInfo) => col.id ?? col.name;

export interface IRequest {
    name: string;
    path: string;
    status: number;
    type: string;
    url: string;
    method: string;
}

interface IRecordListState {
    selectedRow: number;
}

interface IRecord { 
    columns: { [columnName: string]: string | number | boolean }, 
    index: number, 
}

export interface IRecordList {
    headers: IRequestColumnInfo[];
    records: IRecord[];
}

export interface IRequestListProps {
    config: IConfig,
    har: IHarFile,
    parsers: IRequestParser[],
    menuOptions: IMenuOptions;
    searchResult: ISearchResult | undefined;
    onRequestClick: { (entry: Entry | undefined, index: number): void };
}

const highlighted = "is_highlighted";
const parseError = "parseError";
const defaultSelectedRow = 0;

export class RequestList extends Component<IRequestListProps, IRecordListState> {

    private generateList = memoize((_harFileName: string, showHighlightedRequestsOnly: boolean) => generateRequestList(this.props, showHighlightedRequestsOnly))

    private requestIndexList: number[] = [];

    private containerRef = createRef<HTMLDivElement>();

    // holding currently selected row for keyboard navigation
    private currentlySelectedIndex: number = -1;

    constructor(props: IRequestListProps) {
        super(props);

        this.state = {
            selectedRow: -1,
        }

        this.selectRequest(defaultSelectedRow);
    }

    componentDidUpdate(previousProps: Readonly<IRequestListProps>): void {
        // checking whether new file was loaded or filter changed
        if (this.props.har.name != previousProps.har.name || 
            this.props.menuOptions?.showHighlightedRequestsOnly != previousProps.menuOptions?.showHighlightedRequestsOnly) {

            this.currentlySelectedIndex = -1;

            // selecting the first (visible) row after loading the file
            this.selectRequest(this.requestIndexList[0] || defaultSelectedRow);
        }
    }

    render() {

        console.log("Rendering list", this.props.har.name);
        
        const recordList = this.generateList(this.props.har.name, !!this.props.menuOptions?.showHighlightedRequestsOnly);

        this.requestIndexList = recordList.records.map(r => r.index);

        return <div ref={this.containerRef} onKeyDown={evt => this.keyPressed(evt)} tabindex={0} class="outline-none">
            <table className="table table-xs">
                <thead class="bg-base-200 sticky top-0">
                    <tr>
                        {recordList.headers.map(h => (<th style={h.defaultWidth ? "width: " + h.defaultWidth + "px" : ""} class="resize-none hover:resize-x overflow-auto">{h.name}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {recordList.records.map((r) => {
                        const isSearchMatch = !!this.props.searchResult?.matchingIndices.has(r.index);
                        const isSelected = this.state.selectedRow === r.index;
                        const hasError = !!r.columns["Error"];
                        const isHighlighted = !!r.columns[highlighted];

                        return (
                        <tr 
                            data-index={r.index}
                            onClick={() => this.selectRequest(r.index)} 
                            class={classNames([
                                {"bg-primary text-primary-content": isSelected && !hasError},
                                {"bg-primary text-error": isSelected && hasError},
                                {"bg-secondary text-secondary-content": isSearchMatch && !isSelected},
                                {"bg-primary text-primary-content": !isSearchMatch && !isSelected && isHighlighted && !hasError}, 
                                {"bg-primary text-error": !isSearchMatch && !isSelected && isHighlighted && hasError}, 
                                {"[--tw-bg-opacity:.2]": !isSelected && isHighlighted && !isSearchMatch},
                                {"text-error": !isSelected && hasError}])}>
                            {recordList.headers.map(h => {
                                const id = columnId(h);
                                return (
                                    <td class={id === "icon" ? "p-0 !align-middle" : "text-nowrap truncate"}>
                                        {id === "icon" ? <div class="flex items-center justify-center h-full">{renderTypeIcon(r.columns[id] as string)}</div> : r.columns[id]}
                                    </td>
                                );
                            })}
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    }

    private keyPressed(evt: KeyboardEvent) {

        if (evt.key !== "ArrowDown" && evt.key !== "ArrowUp") {
            return;
        }

        evt.preventDefault();

        const pos = this.requestIndexList.indexOf(this.currentlySelectedIndex);
        let nextIndex: number | undefined;
        switch(evt.key) {
            case "ArrowDown":
                if (pos > -1 && this.requestIndexList[pos + 1] !== undefined) {
                    nextIndex = this.requestIndexList[pos + 1];
                }
                break;
            case "ArrowUp":
                if (pos > 0 && this.requestIndexList[pos - 1] !== undefined) {
                    nextIndex = this.requestIndexList[pos - 1];
                }
                break;
        }

        if (nextIndex !== undefined) {
            this.selectRequest(nextIndex);
            this.scrollRowIntoView(nextIndex);
        }
    }

    private scrollRowIntoView(index: number) {
        const container = this.containerRef.current?.parentElement;
        const row = this.containerRef.current?.querySelector(`tr[data-index="${index}"]`) as HTMLElement | null;
        if (!container || !row) return;

        const containerRect = container.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();

        if (rowRect.bottom > containerRect.bottom) {
            row.scrollIntoView({ block: "nearest" });
        } else if (rowRect.top < containerRect.top) {
            row.scrollIntoView({ block: "nearest" });
        }
    }

    private selectRequest(index: number) {
        if (this.currentlySelectedIndex != index) {
            this.currentlySelectedIndex = index;

            this.setState({
                ...this.state,
                selectedRow: index,
            });

            this.props.onRequestClick(this.props.har.content.log.entries[index], index);
        }
    }
}


const generateRequestList = (props: IRequestListProps, showHighlightedRequestsOnly: boolean): IRecordList => {
    console.log("recalculate request list");
    const parsers = props.parsers;

    const headers = parsers.reduce((acc, parser) => {
        // TODO ensure correct order (render before option)

        let newColumns = parser.getColumnsInfo.filter(c => !props.config.hiddenColumns?.includes(columnId(c)));

        newColumns.forEach(column => {
            const existingAlready = acc.find(ec => columnId(ec) === columnId(column));
            if (existingAlready) {
                existingAlready.defaultWidth = column.defaultWidth;
                existingAlready.showBefore = column.showBefore;
            }
            else {
                acc.push(column);
            }
        });
        
        return acc;
    }, [] as IRequestColumnInfo[]);

    if (!props.config.hiddenColumns?.includes("#")) {
        headers.unshift({ id: "#", name: "#", defaultWidth: 40 })
    }

    // remove column dupes

    let records = props.har.content.log.entries.map((entry, i) => {
        const columnValues = parsers.reduce((acc, parser) => {

            if (parser.isRequestSupported(entry)) {
                try {
                    const values = parser.getColumnValues(entry);

                    acc = {
                        ...acc,
                        ...values
                    }

                    if (parser.highlightRequest !== false) {
                        acc[highlighted] = true;
                    }
                }
                catch(e) {
                    acc[parseError] = e as any;
                    console.error(e);
                }
            }

            return acc;
        }, {} as { [columnName: string]: string | number | boolean });

        if (!props.config.hiddenColumns?.includes("#")) {
            columnValues["#"] = i + 1;
        }

        return { 
            columns: columnValues,
            index: i,
        } as IRecord;
    });

    if (showHighlightedRequestsOnly) {
        records = records.filter(r => {
            const isHighlighted = r.columns[highlighted];
            // there is no point to highlight them any more 
            delete r.columns[highlighted];

            return isHighlighted;
        });
    }

    return {
        headers,
        records,
    };
}

const iconSize = "w-4 h-4";

const typeIcons: Record<string, { path: string, viewBox?: string }> = {
    image:  { path: "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z" },
    json:   { path: "M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.1 0-2-.9-2-2v-4a2 2 0 00-2-2v-2a2 2 0 002-2V5a2 2 0 012-2zm14 0a2 2 0 012 2v4a2 2 0 002 2v2a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z" },
    js:     { path: "M3 3h18v18H3V3zm16.5 15.5v-3.5a1.5 1.5 0 00-3 0v3.5h-2v-3.5a3.5 3.5 0 117 0v3.5h-2zM8 15a1.5 1.5 0 01-3 0h2a3.5 3.5 0 01-7 0V9.5h2V15A1.5 1.5 0 008 15z", viewBox: "0 0 24 24" },
    html:   { path: "M4 2l1.6 18L12 22l6.4-2L20 2H4zm13.3 6H9l.3 2h7.7l-.8 8.1-4.2 1.2-4.2-1.2-.3-3.1h2l.2 1.6 2.3.6 2.3-.6.3-2.6H8.5L7.8 6h8.4l-.9 2z", viewBox: "0 0 24 24" },
    css:    { path: "M4 2l1.6 18L12 22l6.4-2L20 2H4zm13.1 5.5l-.2 2H9.6l.2 2h7l-.7 7.5L12 20.5l-4.1-1.5-.3-3h2l.2 1.5 2.2.8 2.2-.8.2-2.5H7.5l-.6-7h10.2z", viewBox: "0 0 24 24" },
    xml:    { path: "M12.9 6.1l2 2L7.2 15.8l-2-2 7.7-7.7zM2 13l4-4 1.4 1.4L4.8 13l2.6 2.6L6 17l-4-4zm20 0l-4 4-1.4-1.4 2.6-2.6-2.6-2.6L18 9l4 4z", viewBox: "0 0 24 24" },
    font:   { path: "M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z" },
    text:   { path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-3h8v2H8v-2z" },
    video:  { path: "M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" },
    audio:  { path: "M12 3v10.55A4 4 0 1014 17V7h4V3h-6zM10 19a2 2 0 110-4 2 2 0 010 4z" },
    binary: { path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" },
};

const renderTypeIcon = (category: string) => {
    const icon = typeIcons[category] || typeIcons.binary;
    return (
        <svg class={`${iconSize} fill-current opacity-60`} xmlns="http://www.w3.org/2000/svg" viewBox={icon.viewBox || "0 0 24 24"}>
            <path d={icon.path} />
        </svg>
    );
}