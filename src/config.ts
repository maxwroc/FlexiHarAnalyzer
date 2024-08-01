import { Entry } from "har-format"
import peopleSearchSuggestions from "./plugins/people-search-suggestions";
import peopleSearchFindpeople from "./plugins/people-search-findpeople";
import peopleSearchQuery from "./plugins/people-search-query";
import peopleSearchTeamsMt from "./plugins/people-search-teams-mt";


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

                        fields.push({ type: "header", label: "Query string parameters" });

                        const url = new URL(entry.request.url);
                        fields.push({
                            type: "table",
                            headers: [
                                { name: "Param", key: "name", width: 220 },
                                { name: "Value", key: "value", copyButton: true },
                            ],
                            values: Array.from(url.searchParams).map(([name, value]) => {
                                return { name, value }
                            })
                        });

                        if (entry.request.method == "POST" && entry.request.postData?.text) {
                            
                            fields.push({ type: "header", label: "Post data" });

                            const isJson = entry.request.postData.mimeType.includes("json");
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

                        fields.push({ type: "text", label: "Size", value: entry.response.bodySize })

                        if (entry.response.content.text) {
                            if (entry.response.content.mimeType.includes("json")) {
                                fields.push({
                                    type: "json",
                                    label: "Preview",
                                    value: JSON.parse(entry.response.content.text)
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
    }
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
} | {
    type: "json",
    label?: string,
    value: object,
} | {
    type: "table",
    label?: string,
    headers: { name: string, key: string, width?: number, wrapIfLong?: boolean, copyButton?: boolean }[],
    values: { [key: string]: any }[],
} | {
    type: "container",
    label?: string,
    style?: "header" | "accordeon",
    fields: TabField[],
}

