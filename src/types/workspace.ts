import type { ISearchOptions } from "../views/search-modal";
import type { IHarFile } from "./har-file";

export type RequestFilterField = "status" | "method" | "host" | "mimeType" | "duration" | "size" | "time";
export type RequestFilterOperator = "equals" | "contains" | "atLeast" | "atMost" | "after" | "before";

export interface IRequestFilter {
    id: string;
    field: RequestFilterField;
    operator: RequestFilterOperator;
    value: string;
}

export interface IRequestSort {
    columnId: string;
    direction: "asc" | "desc";
}

export interface IRequestViewPreferences {
    showHighlightedRequestsOnly: boolean;
    filters: IRequestFilter[];
    hiddenColumns: string[];
    columnWidths: Record<string, number>;
    sort?: IRequestSort;
    activeTab: string;
    searchHistory: ISearchOptions[];
    activeSearchIndex: number;
}

export interface IParserSnapshot {
    fileName: string;
    fileContent: string;
}

export interface IWorkspaceRecord {
    id: string;
    name: string;
    updatedAt: string;
    har: IHarFile;
    preferences: IRequestViewPreferences;
    parsers: IParserSnapshot[];
    sessionRevision?: string;
}

export interface IWorkspaceSummary {
    id: string;
    name: string;
    updatedAt: string;
}

export const createDefaultViewPreferences = (): IRequestViewPreferences => ({
    showHighlightedRequestsOnly: true,
    filters: [],
    hiddenColumns: ["Type"],
    columnWidths: {},
    activeTab: "Request",
    searchHistory: [],
    activeSearchIndex: -1,
});

export const normalizeViewPreferences = (preferences?: Partial<IRequestViewPreferences>): IRequestViewPreferences => {
    const searchHistory = Array.isArray(preferences?.searchHistory) ? preferences.searchHistory.filter(isValidSearchOptions) : [];
    const requestedSearchIndex = Number.isInteger(preferences?.activeSearchIndex) ? preferences!.activeSearchIndex! : -1;
    return {
        showHighlightedRequestsOnly: typeof preferences?.showHighlightedRequestsOnly === "boolean" ? preferences.showHighlightedRequestsOnly : true,
        filters: Array.isArray(preferences?.filters) ? preferences.filters.filter(isValidFilter) : [],
        hiddenColumns: Array.isArray(preferences?.hiddenColumns) ? preferences.hiddenColumns.filter(value => typeof value === "string") : ["Type"],
        columnWidths: normalizeColumnWidths(preferences?.columnWidths),
        sort: isValidSort(preferences?.sort) ? preferences.sort : undefined,
        activeTab: typeof preferences?.activeTab === "string" ? preferences.activeTab : "Request",
        searchHistory,
        activeSearchIndex: requestedSearchIndex >= 0 && requestedSearchIndex < searchHistory.length ? requestedSearchIndex : -1,
    };
};

const filterFields = new Set<RequestFilterField>(["status", "method", "host", "mimeType", "duration", "size", "time"]);
const filterOperators = new Set<RequestFilterOperator>(["equals", "contains", "atLeast", "atMost", "after", "before"]);
const validOperatorsByField: Record<RequestFilterField, Set<RequestFilterOperator>> = {
    status: new Set(["equals"]),
    method: new Set(["equals"]),
    host: new Set(["equals", "contains"]),
    mimeType: new Set(["equals", "contains"]),
    duration: new Set(["atLeast", "atMost"]),
    size: new Set(["atLeast", "atMost"]),
    time: new Set(["after", "before"]),
};

const isValidFilter = (value: unknown): value is IRequestFilter => {
    if (!value || typeof value !== "object") return false;
    const filter = value as Partial<IRequestFilter>;
    if (typeof filter.id !== "string" || !filterFields.has(filter.field as RequestFilterField)
        || !filterOperators.has(filter.operator as RequestFilterOperator) || typeof filter.value !== "string" || !filter.value.trim()) return false;
    const field = filter.field as RequestFilterField;
    const operator = filter.operator as RequestFilterOperator;
    if (!validOperatorsByField[field].has(operator)) return false;
    if (["status", "duration", "size"].includes(field) && !Number.isFinite(Number(filter.value))) return false;
    if (field === "time" && !Number.isFinite(Date.parse(filter.value))) return false;
    return true;
};

const isValidSort = (value: unknown): value is IRequestSort => {
    if (!value || typeof value !== "object") return false;
    const sort = value as Partial<IRequestSort>;
    return typeof sort.columnId === "string" && (sort.direction === "asc" || sort.direction === "desc");
};

const isValidSearchOptions = (value: unknown): value is ISearchOptions => {
    if (!value || typeof value !== "object") return false;
    const search = value as Partial<ISearchOptions>;
    return typeof search.query === "string" && typeof search.caseSensitive === "boolean" && typeof search.regex === "boolean"
        && !!search.request && typeof search.request.url === "boolean" && typeof search.request.headers === "boolean" && typeof search.request.body === "boolean"
        && !!search.response && typeof search.response.headers === "boolean" && typeof search.response.body === "boolean";
};

const normalizeColumnWidths = (value: unknown): Record<string, number> => {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).flatMap(([key, width]) =>
        typeof width === "number" && Number.isFinite(width) ? [[key, Math.max(40, Math.min(500, Math.round(width)))]] : []));
};