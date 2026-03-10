import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";

interface PropDef {
    name: string;
    type: string;
    info?: string;
    children?: PropDef[];
}

const headerType: PropDef[] = [
    { name: "name", type: "string", info: "Header name" },
    { name: "value", type: "string", info: "Header value" },
    { name: "comment", type: "string", info: "Comment" },
];

const cookieType: PropDef[] = [
    { name: "name", type: "string", info: "Cookie name" },
    { name: "value", type: "string", info: "Cookie value" },
    { name: "path", type: "string", info: "Cookie path" },
    { name: "domain", type: "string", info: "Cookie domain" },
    { name: "expires", type: "string", info: "Expiration date (ISO 8601)" },
    { name: "httpOnly", type: "boolean", info: "HTTP only flag" },
    { name: "secure", type: "boolean", info: "Secure flag" },
];

const queryStringType: PropDef[] = [
    { name: "name", type: "string", info: "Parameter name" },
    { name: "value", type: "string", info: "Parameter value" },
];

const contentType: PropDef[] = [
    { name: "size", type: "number", info: "Response body size in bytes" },
    { name: "compression", type: "number", info: "Bytes saved by compression" },
    { name: "mimeType", type: "string", info: "MIME type with charset" },
    { name: "text", type: "string", info: "Response body text (may be base64)" },
    { name: "encoding", type: "string", info: "Encoding (e.g. 'base64')" },
];

const postDataType: PropDef[] = [
    { name: "mimeType", type: "string", info: "MIME type of posted data" },
    { name: "text", type: "string", info: "Plain text posted data" },
    { name: "params", type: "Param[]", info: "List of posted parameters", children: [
        { name: "name", type: "string", info: "Parameter name" },
        { name: "value", type: "string", info: "Parameter value" },
        { name: "fileName", type: "string", info: "Name of posted file" },
        { name: "contentType", type: "string", info: "Content type of posted file" },
    ]},
];

const requestType: PropDef[] = [
    { name: "method", type: "string", info: "HTTP method (GET, POST, etc.)" },
    { name: "url", type: "string", info: "Absolute request URL" },
    { name: "httpVersion", type: "string", info: "HTTP version (e.g. 'HTTP/1.1')" },
    { name: "cookies", type: "Cookie[]", info: "List of cookies", children: cookieType },
    { name: "headers", type: "Header[]", info: "List of request headers", children: headerType },
    { name: "queryString", type: "QueryString[]", info: "Query parameters", children: queryStringType },
    { name: "postData", type: "PostData", info: "Posted data", children: postDataType },
    { name: "headersSize", type: "number", info: "Header size in bytes (-1 if unavailable)" },
    { name: "bodySize", type: "number", info: "POST body size in bytes (-1 if unavailable)" },
];

const responseType: PropDef[] = [
    { name: "status", type: "number", info: "HTTP status code" },
    { name: "statusText", type: "string", info: "Status description" },
    { name: "httpVersion", type: "string", info: "HTTP version" },
    { name: "cookies", type: "Cookie[]", info: "List of cookies", children: cookieType },
    { name: "headers", type: "Header[]", info: "List of response headers", children: headerType },
    { name: "content", type: "Content", info: "Response body details", children: contentType },
    { name: "redirectURL", type: "string", info: "Redirect URL from Location header" },
    { name: "headersSize", type: "number", info: "Header size in bytes (-1 if unavailable)" },
    { name: "bodySize", type: "number", info: "Body size in bytes (-1 if unavailable)" },
];

const timingsType: PropDef[] = [
    { name: "blocked", type: "number", info: "Queue wait time (ms)" },
    { name: "dns", type: "number", info: "DNS resolution time (ms)" },
    { name: "connect", type: "number", info: "TCP connection time (ms)" },
    { name: "send", type: "number", info: "Request send time (ms)" },
    { name: "wait", type: "number", info: "Server response wait time (ms)" },
    { name: "receive", type: "number", info: "Response read time (ms)" },
    { name: "ssl", type: "number", info: "SSL/TLS negotiation time (ms)" },
];

const cacheDetailsType: PropDef[] = [
    { name: "expires", type: "string", info: "Expiration time (ISO 8601)" },
    { name: "lastAccess", type: "string", info: "Last access time (ISO 8601)" },
    { name: "eTag", type: "string", info: "ETag value" },
    { name: "hitCount", type: "number", info: "Cache hit count" },
];

const cacheType: PropDef[] = [
    { name: "beforeRequest", type: "CacheDetails", info: "Cache state before request", children: cacheDetailsType },
    { name: "afterRequest", type: "CacheDetails", info: "Cache state after request", children: cacheDetailsType },
];

const entryType: PropDef[] = [
    { name: "pageref", type: "string", info: "Reference to parent page" },
    { name: "startedDateTime", type: "string", info: "Request start time (ISO 8601)" },
    { name: "time", type: "number", info: "Total elapsed time in ms" },
    { name: "request", type: "Request", info: "HTTP request details", children: requestType },
    { name: "response", type: "Response", info: "HTTP response details", children: responseType },
    { name: "cache", type: "Cache", info: "Cache usage info", children: cacheType },
    { name: "timings", type: "Timings", info: "Request/response timing phases", children: timingsType },
    { name: "serverIPAddress", type: "string", info: "Server IP address" },
    { name: "connection", type: "string", info: "Connection ID or port" },
];

function resolvePropertyChain(chain: string[]): PropDef[] | null {
    let current: PropDef[] = entryType;

    for (const segment of chain) {
        const prop = current.find(p => p.name === segment);
        if (!prop || !prop.children) return null;
        current = prop.children;
    }

    return current;
}

function harCompletionSource(context: CompletionContext): CompletionResult | null {
    // Match "entry." or "entry.request." etc.
    const match = context.matchBefore(/entry(\.\w*)+/);
    if (!match) return null;

    const text = match.text;
    const parts = text.split(".");
    // parts[0] is "entry", rest are property segments
    // The last part is what's being typed (possibly empty after a dot)
    const chain = parts.slice(1, -1); // intermediate segments

    const props = resolvePropertyChain(chain);
    if (!props) return null;

    const from = match.from + text.lastIndexOf(".") + 1;

    return {
        from,
        options: props.map(p => ({
            label: p.name,
            type: "property",
            detail: p.type,
            info: p.info,
            boost: p.children ? 1 : 0,
        })),
        validFor: /^\w*$/,
    };
}

export function harAutocompletion(): Extension {
    return autocompletion({
        override: [harCompletionSource],
    });
}
