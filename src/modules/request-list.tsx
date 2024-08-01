import { Entry } from "har-format";
import { Component } from "preact";
import { IAppState } from "../app";
import { IRequestColumnInfo } from "../config";
import { classNames } from "../utilities";
import { IMenuOptions } from "./menu-bar";

export interface IRequest {
    name: string;
    path: string;
    status: number;
    type: string;
    url: string;
    method: string;
}

export interface IRecordList {
    headers: IRequestColumnInfo[];
    records: { [columnName: string]: string | number | boolean }[];
    selectedRow: number;
}

export interface IRequestListProps {
    appState: IAppState;
    menuOptions: IMenuOptions;
    onRequestClick: { (entry: Entry): void };
}

const highlighted = "is_highlighted";

export class RequestList extends Component<IRequestListProps, IRecordList> {

    constructor(props: IRequestListProps) {
        super(props);

        const parsers = getParsers(this.props.appState);

        const headers = parsers.reduce((acc, parser) => {
            // TODO ensure correct order (render before option)

            let newColumns = parser.getColumnsInfo.filter(c => !this.props.appState.config.hiddenColumns?.includes(c.name));

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

        if (!this.props.appState.config.hiddenColumns?.includes("#")) {
            headers.unshift({ name: "#", defaultWidth: 40 })
        }

        // remove column dupes

        const records = this.props.appState.files.har.log.entries.map((entry, i) => {
            const columnValues = parsers.reduce((acc, parser) => {

                if (parser.isRequestSupported(entry)) {
                    const values = parser.getColumnValues(entry);

                    acc = {
                        ...acc,
                        ...values
                    }
                    

                    if (parser.highlightRequest !== false) {
                        console.log(i, "highlighted")
                        acc[highlighted] = true;
                    }
                }

                return acc;
            }, {} as { [columnName: string]: string | number | boolean });

            if (!this.props.appState.config.hiddenColumns?.includes("#")) {
                columnValues["#"] = i + 1;
            }

            return columnValues;
        });

        this.state = {
            headers,
            records,
            selectedRow: -1,
        }
    }

    render() {
        return <div>
            <table className="table table-xs">
                <thead>
                    <tr>
                        {this.state.headers.map(h => (<th style={h.defaultWidth ? "width: " + h.defaultWidth + "px" : ""}>{h.name}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {this.state.records.map((r, i) => (
                        <tr onClick={() => this.selectRequest(i)} class={classNames([{"bg-primary text-primary-content": this.state.selectedRow === i || !!r[highlighted]}, {"[--tw-bg-opacity:.2]": this.state.selectedRow !== i && !!r[highlighted]}])}>
                            {this.state.headers.map(h => (
                                <td class="text-nowrap truncate">
                                    {r[h.name]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    }

    private selectRequest(index: number) {
        this.setState({
            ...this.state,
            ...{ selectedRow: index }
        });

        this.props.onRequestClick(this.props.appState.files.har.log.entries[index])
    }
}

const getParsers = (state: IAppState) => Object.keys(state.config.requestParsers).map(k => state.config.requestParsers[k]);
