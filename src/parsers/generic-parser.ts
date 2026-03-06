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
