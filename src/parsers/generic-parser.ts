import { Content } from "har-format"
import { CustomTab, TabField, requestParsers } from "../types/config";

requestParsers["generic"] = () => {
    return {
        highlightRequest: false,
        getColumnsInfo: [
            { id: "icon", name: "" , defaultWidth: 28 },
            { name: "Name" },
            { name: "Path" },
            { name: "Status", defaultWidth: 40 },
            { name: "Type", defaultWidth: 130 },
            { name: "Method", defaultWidth: 70 },
        ],
        isRequestSupported() {
            return true;
        },
        getColumnValues(entry) {

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
                "icon": getMimeCategory(entry.response.content.mimeType),
                "Name": name,
                "Path": uri.pathname,
                "Status": entry.response.status.toString(),
                "Type": entry.response.content.mimeType.split(";").shift() as string,
                //"Url": entry.request.url,
                "Method": entry.request.method,
                "Error": (<any>entry.response)["_error"],
            }
        },
        getCustomTabs() {

            const tabs: CustomTab[] = [];

            tabs.push({
                name: "Request",
                getFields(entry) {
                    const fields: TabField[] = [];

                    fields.push({ type: "text", label: "Method", value: entry.request.method });
                    fields.push({ type: "text", label: "URL", value: entry.request.url });

                    let requestTime = entry.request.headers.find(h => h.name == "date")?.value || entry.startedDateTime;
                    if (requestTime) {
                        const oneDay = 1000 * 60 * 60 * 24;
                        const diffInTime = new Date().getTime() - Date.parse(requestTime);
                        const daysAgo = Math.round(diffInTime / oneDay);
                        fields.push({
                            type: "input-group",
                            label: "Time",
                            value1: requestTime,
                            value2: `${daysAgo} days ago`,
                        });
                    }

                    if (entry.request.method == "POST" && entry.request.postData?.text) {
                        // e.g. "application/json;odata=verbose"
                        let isJson = entry.request.postData.mimeType?.includes("application/json");
                        let postBody: any = entry.request.postData.text;
                        if (isJson) {
                            try {
                                postBody = JSON.parse(entry.request.postData.text)
                            } catch (_error) {
                                console.warn("Post body is not a valid JSON", _error);
                                isJson = false;
                            }
                        }

                        fields.push({
                            type: isJson ? "json" : "large-text",
                            value: postBody,
                            label: "Post data"
                        });
                    }

                    const url = new URL(entry.request.url);
                    const queryParams = Array.from(url.searchParams).map(([name, value]) => {
                        return { name, value }
                    });

                    if (queryParams.length) {
                        fields.push({
                            type: "container",
                            style: "accordion",
                            label: "Query string parameters",
                            fields: [{
                                type: "table",
                                headers: [
                                    { name: "Param", key: "name", width: 220 },
                                    { name: "Value", key: "value", copyButton: true },
                                ],
                                values: queryParams,
                            }],
                        });
                    }

                    fields.push({
                        type: "container",
                        style: "accordion",
                        label: "Request headers",
                        fields: [{
                            type: "table",
                            headers: [
                                { name: "Name", key: "name", width: 220 },
                                { name: "Value", key: "value", copyButton: true },
                            ],
                            values: entry.request.headers
                        }],
                    });

                    return fields;
                },
            });

            tabs.push({
                name: "Response",
                getFields(entry) {
                    const fields: TabField[] = [];

                    const error = (<any>entry.response)["_error"];
                    if (error) {
                        fields.push({ type: "text", label: "Error", value: error })

                        const hint = getErrorHint(error);
                        if (hint) {
                            fields.push({ type: "hint", label: "Possible reason", value: hint, style: "warning" });
                        }
                    }

                    fields.push({ type: "text", label: "Status", value: `${entry.response.status} ${entry.response.statusText}` })
                    fields.push({ type: "text", label: "Size", value: entry.response.content.size })

                    if (entry.response.content.text) {
                        const jsonResponse = getJsonContent(entry.response.content);
                        if (jsonResponse) {
                            fields.push({
                                type: "json",
                                label: "Preview",
                                value: jsonResponse,
                                options: {
                                    searchEnabled: true,
                                },
                            })
                        }

                        fields.push({
                            type: "container",
                            style: "accordion",
                            label: "Raw response",
                            fields: [{
                                type: "large-text",
                                value: entry.response.content.text
                            }],
                        });
                    }

                    fields.push({
                        type: "container",
                        style: "accordion",
                        label: "Response headers",
                        fields: [{
                            type: "table",
                            headers: [
                                { name: "Name", key: "name", width: 220 },
                                { name: "Value", key: "value", copyButton: true },
                            ],
                            values: entry.response.headers
                        }],
                    });

                    return fields;
                },
            })

            return tabs;
        }
    }
}

const getJsonContent = (content: Content) => {
    if (!content.mimeType.includes("application/json") || !content.text) {
        return null;
    }

    try {
        let data = content.text;
        if (content.encoding == "base64") {
            data = atob(data);
        }

        return JSON.parse(data);
    }
    catch (e) {
        console.error("Failed to parse response", e);
    }

    return null;
}

const getMimeCategory = (mimeType: string): string => {
    const mime = (mimeType || "").split(";")[0].trim().toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.includes("json")) return "json";
    if (mime.includes("javascript")) return "js";
    if (mime.includes("html")) return "html";
    if (mime.includes("css")) return "css";
    if (mime.includes("xml")) return "xml";
    if (mime.startsWith("font/") || mime.includes("woff") || mime.includes("ttf") || mime.includes("otf")) return "font";
    if (mime.startsWith("text/")) return "text";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "binary";
}

const errorHints: { pattern: string, hint: string }[] = [
    { pattern: "ERR_NAME_NOT_RESOLVED", hint: "The domain name could not be resolved. The server might not exist, the URL could be misspelled, or DNS may be unavailable." },
    { pattern: "ERR_CONNECTION_REFUSED", hint: "The server actively refused the connection. The service might not be running or is listening on a different port." },
    { pattern: "ERR_CONNECTION_TIMED_OUT", hint: "The connection attempt timed out. The server may be down, unreachable, or blocked by a firewall." },
    { pattern: "ERR_CONNECTION_RESET", hint: "The connection was reset by the server or a network device. This can happen due to server crashes, proxy issues, or network instability." },
    { pattern: "ERR_CONNECTION_CLOSED", hint: "The connection was closed unexpectedly. The server may have dropped the connection before sending a response." },
    { pattern: "ERR_INTERNET_DISCONNECTED", hint: "The device appears to have been offline when the request was made." },
    { pattern: "ERR_SSL_PROTOCOL_ERROR", hint: "An SSL/TLS protocol error occurred. The server's SSL configuration may be incorrect or incompatible." },
    { pattern: "ERR_CERT_AUTHORITY_INVALID", hint: "The server's SSL certificate is signed by an untrusted certificate authority (e.g. self-signed certificate)." },
    { pattern: "ERR_CERT_DATE_INVALID", hint: "The server's SSL certificate has expired or is not yet valid." },
    { pattern: "ERR_CERT_COMMON_NAME_INVALID", hint: "The SSL certificate's domain name does not match the requested URL." },
    { pattern: "ERR_TOO_MANY_REDIRECTS", hint: "The request resulted in too many redirects (redirect loop). Check server-side redirect rules or cookies." },
    { pattern: "ERR_EMPTY_RESPONSE", hint: "The server accepted the connection but closed it without sending any data." },
    { pattern: "ERR_CONTENT_LENGTH_MISMATCH", hint: "The amount of data received did not match the Content-Length header. The response may have been truncated." },
    { pattern: "ERR_INCOMPLETE_CHUNKED_ENCODING", hint: "The server sent a chunked response but did not terminate it properly." },
    { pattern: "ERR_BLOCKED_BY_CLIENT", hint: "The request was blocked by a browser extension (e.g. ad blocker) or content security policy." },
    { pattern: "ERR_BLOCKED_BY_RESPONSE", hint: "The response was blocked due to CORS, COEP, or other cross-origin security policies." },
    { pattern: "ERR_ABORTED", hint: "The request was aborted, possibly due to page navigation, manual cancellation, or a timeout." },
    { pattern: "ERR_FAILED", hint: "A generic network failure occurred. This can be caused by CORS issues, mixed content blocking, or network-level problems." },
    { pattern: "ERR_NETWORK_CHANGED", hint: "The network connection changed (e.g. switching between Wi-Fi and mobile data) while the request was in progress." },
    { pattern: "ERR_TIMED_OUT", hint: "The request timed out waiting for a response from the server." },
    { pattern: "ERR_ACCESS_DENIED", hint: "Access to the network resource was denied, possibly by OS-level security or firewall rules." },
    { pattern: "ERR_TUNNEL_CONNECTION_FAILED", hint: "Failed to establish a tunnel connection through a proxy server. Proxy configuration may be incorrect." },
    { pattern: "ERR_ADDRESS_UNREACHABLE", hint: "The IP address of the server could not be reached. The server may be on an unreachable network." },
    { pattern: "ERR_PROXY_CONNECTION_FAILED", hint: "The connection to the proxy server failed. The proxy may be down or misconfigured." },
    { pattern: "ERR_CACHE_MISS", hint: "The resource was expected to be served from cache but was not found there." },
    { pattern: "ERR_HTTP2_PROTOCOL_ERROR", hint: "An HTTP/2 protocol-level error occurred. The server's HTTP/2 implementation may have issues." },
];

const getErrorHint = (error: string): string | null => {
    const upperError = error.toUpperCase();
    const match = errorHints.find(e => upperError.includes(e.pattern));
    return match?.hint || null;
}
