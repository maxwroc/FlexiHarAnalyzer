import { Entry } from "har-format"
import peopleSearchSuggestions from "./plugins/people-search-suggestions";
import peopleSearchFindpeople from "./plugins/people-search-findpeople";


export const defaultConfig: IConfig = {
    hiddenColumns: [
        "Type"
    ],
    requestParsers: {
        "generic": {
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
                return;
            }
        },
        ...peopleSearchSuggestions,
        ...peopleSearchFindpeople,
    }
}


export interface IConfig {
    hiddenColumns?: string[] | undefined;
    requestParsers: { [id: string]: IRequestPerser };
}

export interface IRequestPerser {
    getColumnsInfo: IRequestColumnInfo[];
    isRequestSupported(entry: Entry): boolean;
    getColumnValues(entry: Entry): { [columnName: string]: string };
    getCustomTabs(entry: Entry): ICustomTab[] | void;
}

export interface IRequestColumnInfo {
    name: string;
    defaultWidth?: number;
    showBefore?: string;
}

export interface ICustomTab {
    name: string;
    getFields: { (entry: Entry): ICustomTabField[] };
}

export interface ICustomTabField {
    type: "text" | "large-text" | "html" | "json";
    label?: string;
    value: any
}


export type CustomTab = {
    name: string,
    getFields: { (entry: Entry): TabField[] }
}

export type TabField = {
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

