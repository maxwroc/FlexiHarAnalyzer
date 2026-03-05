import { Entry } from "har-format";
import { ISearchOptions } from "../views/search-modal";

/** Set of entry indices that matched the search */
export interface ISearchResult {
    options: ISearchOptions;
    matchingIndices: Set<number>;
}

/** A single snippet showing where the term was found */
export interface ISearchSnippet {
    /** Where the match was found, e.g. "Request URL", "Response Body" */
    location: string;
    /** Text surrounding the match: [before, matched, after] triples */
    fragments: ISearchFragment[];
}

export interface ISearchFragment {
    before: string;
    match: string;
    after: string;
    /** If set, contains the entire formatted JSON with match lines flagged */
    jsonBody?: { text: string; highlight: boolean }[];
}

const CONTEXT_CHARS = 60;

/**
 * Performs a lightweight pass over all entries to determine which ones match.
 * Does NOT collect snippets — that happens lazily per-entry.
 */
export function searchEntries(entries: Entry[], options: ISearchOptions): ISearchResult {
    const pattern = buildPattern(options);
    if (!pattern) {
        return { options, matchingIndices: new Set() };
    }

    const matchingIndices = new Set<number>();

    for (let i = 0; i < entries.length; i++) {
        if (entryMatches(entries[i], options, pattern)) {
            matchingIndices.add(i);
        }
    }

    return { options, matchingIndices };
}

/**
 * Produces detailed search snippets for a single entry (called lazily when the user clicks a matched row).
 */
export function searchEntry(entry: Entry, options: ISearchOptions): ISearchSnippet[] {
    const pattern = buildPattern(options);
    if (!pattern) {
        return [];
    }

    const snippets: ISearchSnippet[] = [];

    // Request URL
    if (options.request.url) {
        collectSnippets(entry.request.url, "Request URL", pattern, snippets);
    }

    // Request Headers
    if (options.request.headers) {
        for (const h of entry.request.headers) {
            collectSnippets(`${h.name}: ${h.value}`, "Request Header", pattern, snippets);
        }
    }

    // Request Body
    if (options.request.body) {
        const postText = entry.request.postData?.text;
        if (postText) {
            collectBodySnippets(postText, entry.request.postData?.mimeType, "Request Body", pattern, snippets);
        }
    }

    // Response Headers
    if (options.response.headers) {
        for (const h of entry.response.headers) {
            collectSnippets(`${h.name}: ${h.value}`, "Response Header", pattern, snippets);
        }
    }

    // Response Body
    if (options.response.body) {
        const respText = getResponseText(entry);
        if (respText) {
            collectBodySnippets(respText, entry.response.content.mimeType, "Response Body", pattern, snippets);
        }
    }

    return snippets;
}

// ---- internal helpers ----

function buildPattern(options: ISearchOptions): RegExp | null {
    if (!options.query) return null;

    const flags = options.caseSensitive ? "g" : "gi";
    try {
        const source = options.regex ? options.query : escapeRegex(options.query);
        return new RegExp(source, flags);
    } catch {
        return null;
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Fast check — returns true on first match found in any enabled field. */
function entryMatches(entry: Entry, options: ISearchOptions, pattern: RegExp): boolean {
    if (options.request.url && testPattern(pattern, entry.request.url)) return true;

    if (options.request.headers) {
        for (const h of entry.request.headers) {
            if (testPattern(pattern, h.name) || testPattern(pattern, h.value)) return true;
        }
    }

    if (options.request.body) {
        const postText = entry.request.postData?.text;
        if (postText && testPattern(pattern, postText)) return true;
    }

    if (options.response.headers) {
        for (const h of entry.response.headers) {
            if (testPattern(pattern, h.name) || testPattern(pattern, h.value)) return true;
        }
    }

    if (options.response.body) {
        const respText = getResponseText(entry);
        if (respText && testPattern(pattern, respText)) return true;
    }

    return false;
}

function testPattern(pattern: RegExp, text: string): boolean {
    pattern.lastIndex = 0;
    return pattern.test(text);
}

function getResponseText(entry: Entry): string | null {
    const content = entry.response.content;
    if (!content.text) return null;

    if (content.encoding === "base64") {
        try { return atob(content.text); } catch { return null; }
    }

    return content.text;
}

function collectSnippets(text: string, location: string, pattern: RegExp, out: ISearchSnippet[]) {
    pattern.lastIndex = 0;
    const fragments: ISearchFragment[] = [];
    let m: RegExpExecArray | null;

    // Limit fragments per field to avoid huge results
    const MAX_FRAGMENTS = 20;

    while ((m = pattern.exec(text)) !== null && fragments.length < MAX_FRAGMENTS) {
        const start = Math.max(0, m.index - CONTEXT_CHARS);
        const end = Math.min(text.length, m.index + m[0].length + CONTEXT_CHARS);
        fragments.push({
            before: (start > 0 ? "…" : "") + text.slice(start, m.index),
            match: m[0],
            after: text.slice(m.index + m[0].length, end) + (end < text.length ? "…" : ""),
        });

        // Prevent infinite loop on zero-length matches
        if (m[0].length === 0) pattern.lastIndex++;
    }

    if (fragments.length > 0) {
        out.push({ location, fragments });
    }
}

function collectBodySnippets(text: string, mimeType: string | undefined, location: string, pattern: RegExp, out: ISearchSnippet[]) {
    const formatted = tryFormatJson(text, mimeType);
    if (formatted) {
        collectJsonBody(formatted, location, pattern, out);
    } else {
        collectSnippets(text, location, pattern, out);
    }
}

function tryFormatJson(text: string, mimeType: string | undefined): string | null {
    if (!mimeType?.includes("json")) return null;
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
        return null;
    }
}

function collectJsonBody(formattedJson: string, location: string, pattern: RegExp, out: ISearchSnippet[]) {
    pattern.lastIndex = 0;
    const lines = formattedJson.split("\n");
    const matchLineIndices = new Set<number>();

    let m: RegExpExecArray | null;
    while ((m = pattern.exec(formattedJson)) !== null) {
        // Find which line this match is on
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineEnd = charCount + lines[i].length;
            if (m.index >= charCount && m.index <= lineEnd) {
                matchLineIndices.add(i);
                break;
            }
            charCount += lines[i].length + 1; // +1 for \n
        }
        if (m[0].length === 0) pattern.lastIndex++;
    }

    if (matchLineIndices.size === 0) return;

    const jsonBody = lines.map((text, i) => ({ text, highlight: matchLineIndices.has(i) }));

    // Single fragment carrying the entire formatted JSON
    out.push({
        location,
        fragments: [{ before: "", match: "", after: "", jsonBody }],
    });
}
