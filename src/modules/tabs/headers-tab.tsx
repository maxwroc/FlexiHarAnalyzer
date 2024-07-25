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
                    <td class="text-nowrap truncate relative" onMouseEnter={e => (e.target as HTMLElement).classList.replace("text-nowrap","text-wrap")} onMouseLeave={e => (e.target as HTMLElement).classList.replace("text-wrap","text-nowrap")}>
                        <div class="copy-button absolute right-3 top-1 z-[1]">
                            <button class="btn btn-xs btn-square btn-neutral cursor-copy" aria-label="copy" onClick={() => copyToClipboard(h.value)}>
                                <svg class="fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                <path d="M 16 3 C 14.742188 3 13.847656 3.890625 13.40625 5 L 6 5 L 6 28 L 26 28 L 26 5 L 18.59375 5 C 18.152344 3.890625 17.257813 3 16 3 Z M 16 5 C 16.554688 5 17 5.445313 17 6 L 17 7 L 20 7 L 20 9 L 12 9 L 12 7 L 15 7 L 15 6 C 15 5.445313 15.445313 5 16 5 Z M 8 7 L 10 7 L 10 11 L 22 11 L 22 7 L 24 7 L 24 26 L 8 26 Z"></path>
                                </svg>
                            </button>
                        </div>
                        {h.value}
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
)

const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);