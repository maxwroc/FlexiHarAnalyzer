import { Entry } from "har-format";
import { Component } from "preact";
import { IAppState } from "../app";
import { IRequestColumnInfo } from "../config";
import { classNames } from "../components/view-helpers";
import { IMenuOptions } from "./menu-bar";
import memoize from "memoize-one";

export interface IRequest {
    name: string;
    path: string;
    status: number;
    type: string;
    url: string;
    method: string;
}

interface IRecordListState {
    harFileName: string;
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
    appState: IAppState;
    menuOptions: IMenuOptions;
    onRequestClick: { (entry: Entry): void };
}

const highlighted = "is_highlighted";
const parseError = "parseError";

export class RequestList extends Component<IRequestListProps, IRecordListState> {

    private generateList: { (harFileName: string, showHighlightedRequestsOnly: boolean): IRecordList };

    private requestIndexList: number[] = [];
    private currentlySelectedIndex: number = -1;

    constructor(props: IRequestListProps) {
        super(props);

        this.generateList = memoize((_harFileName: string, showHighlightedRequestsOnly: boolean) => RequestList.generateRequestList(this.props, showHighlightedRequestsOnly));
    }

    static generateRequestList(props: IRequestListProps, showHighlightedRequestsOnly: boolean): IRecordList {
        console.log("recalculate request list");
        const parsers = props.appState.parsers;

        const headers = parsers.reduce((acc, parser) => {
            // TODO ensure correct order (render before option)

            let newColumns = parser.getColumnsInfo.filter(c => !props.appState.config.hiddenColumns?.includes(c.name));

            newColumns.forEach(column => {
                const existingAlready = acc.find(ec => ec.name === column.name);
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

        if (!props.appState.config.hiddenColumns?.includes("#")) {
            headers.unshift({ name: "#", defaultWidth: 40 })
        }

        // remove column dupes

        let records = props.appState.files.har.log.entries.map((entry, i) => {
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

            if (!props.appState.config.hiddenColumns?.includes("#")) {
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

    render() {
        
        const recordList = this.generateList(this.state.harFileName, !!this.props.menuOptions?.showHighlightedRequestsOnly);

        this.requestIndexList = recordList.records.map(r => r.index);

        return <div onKeyUp={evt => this.keyPressed(evt)} tabindex={0}>
            <table className="table table-xs">
                <thead class="bg-base-200 sticky top-0">
                    <tr>
                        {recordList.headers.map(h => (<th style={h.defaultWidth ? "width: " + h.defaultWidth + "px" : ""} class="resize-none hover:resize-x overflow-auto">{h.name}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {recordList.records.map((r) => (
                        <tr 
                            onClick={() => this.selectRequest(r.index)} 
                            class={classNames([
                                {"bg-primary text-primary-content": (this.state.selectedRow === r.index || !!r.columns[highlighted]) && !r.columns["Error"]}, 
                                {"bg-primary text-error": (this.state.selectedRow === r.index || !!r.columns[highlighted]) && !!r.columns["Error"]}, 
                                {"[--tw-bg-opacity:.2]": this.state.selectedRow !== r.index && !!r.columns[highlighted]},
                                {"text-error": !!r.columns["Error"]}])}>
                            {recordList.headers.map(h => (
                                <td class="text-nowrap truncate">
                                    {r.columns[h.name]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    }

    private keyPressed(evt: KeyboardEvent) {

        evt.preventDefault();

        const pos = this.requestIndexList.indexOf(this.currentlySelectedIndex);
        switch(evt.key) {
            case "ArrowDown":
                if (pos > -1 && this.requestIndexList[pos + 1] !== undefined) {
                    this.selectRequest(this.requestIndexList[pos + 1])
                }
                break;
            case "ArrowUp":
                if (pos > 0 && this.requestIndexList[pos - 1] !== undefined) {
                    this.selectRequest(this.requestIndexList[pos - 1])
                }
                break;
            default:
                console.log("key: ",evt.key);
        }
    }

    private selectRequest(index: number) {
        this.currentlySelectedIndex = index;
        console.log("selected", index)
        this.setState({
            ...this.state,
            ...{ selectedRow: index }
        });

        this.props.onRequestClick(this.props.appState.files.har.log.entries[index])
    }
}

