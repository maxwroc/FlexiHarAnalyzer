import { Entry, Header } from "har-format";


export const getHeadersTab = (entry: Entry) => <>
    <div class="collapse collapse-plus bg-base-100">
        <input type="radio" name="request-headers" />
        <div class="collapse-title text-xl font-medium">Request</div>
        <div class="collapse-content">
            {listHeaders(entry.request.headers)}
        </div>
    </div>
    <div class="collapse collapse-plus bg-base-100 mt-5">
        <input type="radio" name="request-headers" checked={true} />
        <div class="collapse-title text-xl font-medium">Response</div>
        <div class="collapse-content">
            {listHeaders(entry.response.headers)}
        </div>
    </div>
</>


const listHeaders = (headers: Header[]) => (
    <table className="table table-xs">
        <thead>
            <tr>
                <th style="width: 220px">Name</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
            {headers.map(h => (
                <tr>
                    <td class="text-nowrap truncate">{h.name}</td>
                    <td class="text-nowrap truncate" onMouseOver={e => (e.target as HTMLElement).classList.replace("text-nowrap","text-wrap")} onMouseOut={e => (e.target as HTMLElement).classList.replace("text-wrap","text-nowrap")}>{h.value}</td>
                </tr>
            ))}
        </tbody>
    </table>
)