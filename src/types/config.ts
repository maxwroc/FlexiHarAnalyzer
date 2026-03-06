import { Content, Entry } from "har-format"

export const requestParsers: IRequestParserCollection = {};
window[<any>"request_parsers"] = <any>requestParsers;

export const defaultConfig: IConfig = {
    hiddenColumns: [
        "Type"
    ],
}

export interface IConfig {
    hiddenColumns?: string[] | undefined;
}

export interface IRequestParser {
    common?: any;
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
    style?: "header",
    fields: TabField[],
} | {
    type: "label",
    label?: string,
} | {
    type: "link",
    label?: string,
    text?: string,
    href: string,
} | TabFieldAccordion;

export type TabFieldAccordion = {
    type: "container",
    label?: string,
    /** @deprecated Use "accordion" instead */
    style: "accordion" | "accordeon",
    fields: TabField[],
}

export type TabFieldJson = {
    type: "json",
    label?: string,
    value: object,
    options?: {
        autoExpand?: number,
        searchEnabled?: boolean,
        teaserFields?: string[],
    },
}


export interface IRequestParserCollection {
    [id: string]: IRequestParserInit
}


export interface IRequestParserInit {
    (context: IRequestParserContext): IRequestParser
}

export interface IRequestParserContext {
    [name: string]: any;
    getJsonContent: (content: Content) => any;
}
