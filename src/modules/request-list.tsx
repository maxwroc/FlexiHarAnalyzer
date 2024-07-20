import { Entry } from "har-format";
import { Component } from "preact";

export interface IRequest {
    name: string;
    path: string;
    status: number;
    type: string;
    url: string;
    method: string;
}

export interface IRecordList {
    headers: { name: string, key: keyof IRequest }[];
    records: IRequest[];
    selectedRow: number;
}

export interface IRequestListProps {
    entries: Entry[];
    onRequestClick: { (entry: Entry): void };
}

export class RequestList extends Component<IRequestListProps, IRecordList> {

    constructor(props: IRequestListProps) {
        super(props);

        this.state = {
            headers: [
                { name: "Name", key: "name" },
                { name: "Path", key: "path" },
                { name: "Status", key: "status" },
                { name: "Type", key: "type" },
                { name: "Method", key: "method" },
            ],
            records: this.props.entries.map(e => this.getRequestData(e)),
            selectedRow: -1,
        }
    }

    render() {
        return <div>
            <table className="table table-xs">
                <thead>
                    <tr>
                        {this.state.headers.map(h => (<th>{h.name}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {this.state.records.map((r, i) => (
                        <tr onClick={() => this.selectRequest(i)} class={this.state.selectedRow == i ? "bg-accent text-accent-content" : ""}>
                            {this.state.headers.map(h => (
                                <td class="text-nowrap">
                                    {r[h.key]}
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

        this.props.onRequestClick(this.props.entries[index])
    }

    private getRequestData(entry: Entry): IRequest {

        const uri = new URL(entry.request.url);

        let name = "";
        let pathChunks = uri.pathname.split("/");
        if (pathChunks.length == 0) {
            name = uri.hostname;
        }
        else {
            name = pathChunks[pathChunks.length - 1];
        }

        name += uri.search;

        return {
            name,
            path: uri.pathname,
            status: entry.response.status,
            type: entry.response.content.mimeType.split(";").shift() as string,
            url: entry.request.url,
            method: entry.request.method
        }
    }
}