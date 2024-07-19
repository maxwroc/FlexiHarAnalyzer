import { Entry } from "har-format";
import { Component } from "preact";

export interface IRequest {
    url: string;
    method: string;
}

export interface IRecordList {
    headers: { name: string, key: keyof IRequest }[];
    records: IRequest[];
}

export interface IRequestListProps {
    entries: Entry[];
    onRequestClick: { (entry: Entry): void };
}

export class RequestList extends Component<IRequestListProps, IRecordList> {

    constructor() {
        super();

        this.state = {
            headers: [
                { name: "Url", key: "url" },
                { name: "Method", key: "method" },
            ],
            records: this.props.entries.map(e => this.getRequestData(e))
        }
    }

    render() {
        return <div>
            <table className="table table-xs">
                <thead>
                    <tr>
                        {this.state.headers.map(h => (<th>{h}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {this.state.records.map((r, i) => (
                        <tr onClick={e => this.props.onRequestClick(this.props.entries[i])}>
                            {this.state.headers.map(h => (
                                <td>
                                    {r[h.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    }

    private getRequestData(entry: Entry): IRequest {
        return {
            url: entry.request.url,
            method: entry.request.method
        }
    }
}