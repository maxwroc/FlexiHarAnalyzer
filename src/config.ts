import { Content, Entry } from "har-format"
import peopleSearchSuggestions from "./plugins/people-search-suggestions";
import peopleSearchFindpeople from "./plugins/people-search-findpeople";
import peopleSearchQuery from "./plugins/people-search-query";
import peopleSearchTeamsMt from "./plugins/people-search-teams-mt";
import peopleSearchInit from "./plugins/people-search-init";
import peopleSearchPeople from "./plugins/people-search-people";


export const defaultConfig: IConfig = {
    hiddenColumns: [
        "Type"
    ],
    requestParsers: {
        "generic": {
            highlightRequest: false,
            getColumnsInfo: [
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
                    name: "Headers",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        fields.push({
                            type: "container",
                            style: "accordeon",
                            label: "Request",
                            fields: [
                                {
                                    type: "table",
                                    headers: [
                                        { name: "Name", key: "name",width: 220 },
                                        { name: "Value", key: "value", copyButton: true },
                                    ],
                                    values: entry.request.headers
                                }
                            ],
                        });
                        
                        fields.push({
                            type: "container",
                            style: "accordeon",
                            label: "Response",
                            fields: [
                                {
                                    type: "table",
                                    headers: [
                                        { name: "Name", key: "name",width: 220 },
                                        { name: "Value", key: "value", copyButton: true },
                                    ],
                                    values: entry.response.headers
                                }
                            ],
                        });

                        return fields;
                    },
                });

                tabs.push({
                    name: "Payload",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        fields.push({ type: "header", label: "Url" });

                        fields.push({ type: "text", value: entry.request.url });


                        const url = new URL(entry.request.url);
                        const queryParams = Array.from(url.searchParams).map(([name, value]) => {
                            return { name, value }
                        });

                        if (queryParams.length) {
                            fields.push({ type: "header", label: "Query string parameters" });
                            fields.push({
                                type: "table",
                                headers: [
                                    { name: "Param", key: "name", width: 220 },
                                    { name: "Value", key: "value", copyButton: true },
                                ],
                                values: queryParams,
                            });
                        }

                        if (entry.request.method == "POST" && entry.request.postData?.text) {
                            
                            fields.push({ type: "header", label: "Post data" });

                            // e.g. "application/json;odata=verbose"
                            const isJson = entry.request.postData.mimeType?.includes("application/json");
                            fields.push({
                                type: isJson ? "json" : "large-text",
                                value: isJson ? JSON.parse(entry.request.postData.text) : entry.request.postData.text
                            });
                        }

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

                        fields.push({ type: "text", label: "Size", value: entry.response.content.size })

                        if (entry.response.content.text) {
                            const jsonResponse = getJsonContent(entry.response.content);
                            if (jsonResponse) {
                                fields.push({
                                    type: "json",
                                    label: "Preview",
                                    value: jsonResponse,
                                })
                            }

                            fields.push({
                                type: "large-text",
                                label: "Raw",
                                value: entry.response.content.text
                            })
                        }

                        return fields;
                    },
                })

                return tabs;
            }
        },
        ...peopleSearchSuggestions,
        ...peopleSearchFindpeople,
        ...peopleSearchQuery,
        ...peopleSearchTeamsMt,
        ...peopleSearchInit,
        ...peopleSearchPeople,
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


export interface IConfig {
    hiddenColumns?: string[] | undefined;
    requestParsers: { [id: string]: IRequestParser };
}

export interface IRequestParser {
    highlightRequest?: boolean;
    getColumnsInfo: IRequestColumnInfo[];
    isRequestSupported(entry: Entry): boolean;
    getColumnValues(entry: Entry): { [columnName: string]: string };
    getCustomTabs(entry: Entry): CustomTab[] | void;
}

export interface IRequestColumnInfo {
    name: string;
    defaultWidth?: number;
    showBefore?: string;
}

export type CustomTab = {
    name: string,
    getFields: { (entry: Entry): TabField[] }
}

export type TabField = {
    type: "header",
    label: string,
} | {
    type: "text" | "large-text",
    label?: string,
    value: string | number,
} | TabFieldJson | {
    type: "table",
    label?: string,
    headers: { name: string, key: string, width?: number, wrapIfLong?: boolean, copyButton?: boolean }[],
    values: { [key: string]: any }[],
} | {
    type: "container",
    label?: string,
    style?: "header" | "accordeon",
    fields: TabField[],
} | {
    type: "label",
    label?: string,
} | {
    type: "link",
    label?: string,
    text?: string,
    href: string,
}

export type TabFieldJson = {
    type: "json",
    label?: string,
    value: object,
    options?: {
        autoExpand?: number,
    },
}

