import { Entry } from "har-format";
import { Component } from "preact";
import { IAppState } from "../app";
import { IRequestColumnInfo } from "../config";

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
    records: { [columnName: string]: string }[];
    selectedRow: number;
}

export interface IRequestListProps {
    appState: IAppState;
    onRequestClick: { (entry: Entry): void };
}

export class RequestList extends Component<IRequestListProps, IRecordList> {

    constructor(props: IRequestListProps) {
        super(props);

        const parsers = getParsers(this.props.appState);

        const headers = parsers.reduce((acc, parser) => {
            // TODO ensure correct order
            acc.push(...parser.getColumnsInfo)
            return acc;
        }, [] as IRequestColumnInfo[]);

        const records = this.props.appState.files.har.log.entries.map(entry => {
            const columnValues = parsers.reduce((acc, parser) => {

                if (parser.isRequestSupported(entry)) {
                    const values = parser.getColumnValues(entry);

                    acc = {
                        ...acc,
                        ...values
                    }
                }

                return acc;
            }, {} as { [columnName: string]: string });

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
                        <tr onClick={() => this.selectRequest(i)} class={this.state.selectedRow == i ? "bg-accent text-accent-content" : ""}>
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