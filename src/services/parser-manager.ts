import { Entry } from "har-format";
import { CustomTab, IRequestParser, IRequestParserContext, requestParsers } from "../types/config";
import { IParserSnapshot } from "../types/workspace";
import { parserErrorStore } from "./parser-error-store";

const parserOwners = ((<any>window)["__flexi_parser_owners"] ??= {}) as Record<string, string>;

/**
 * Wraps a parser in a safe proxy that catches runtime errors
 */
function wrapParser(parserId: string, parser: IRequestParser): IRequestParser {
    return {
        common: parser.common,
        highlightRequest: parser.highlightRequest,
        getColumnsInfo: parser.getColumnsInfo,

        isRequestSupported(entry) {
            try {
                return parser.isRequestSupported(entry);
            } catch (e) {
                console.error(`Parser "${parserId}" error in isRequestSupported():`, e);
                parserErrorStore.add(parserId, "isRequestSupported", e);
                return false;
            }
        },

        getColumnValues(entry) {
            try {
                return parser.getColumnValues(entry);
            } catch (e) {
                console.error(`Parser "${parserId}" error in getColumnValues():`, e);
                parserErrorStore.add(parserId, "getColumnValues", e);
                return {};
            }
        },

        getCustomTabs(entry) {
            let tabs: CustomTab[] | void;
            try {
                tabs = parser.getCustomTabs(entry);
            } catch (e) {
                console.error(`Parser "${parserId}" error in getCustomTabs():`, e);
                parserErrorStore.add(parserId, "getCustomTabs", e);
                return;
            }

            if (!tabs) return tabs;

            return tabs.filter(Boolean).map(tab => ({
                ...tab,
                getFields(tabEntry: Entry) {
                    try {
                        return tab.getFields(tabEntry);
                    } catch (e) {
                        console.error(`Parser "${parserId}" error in tab "${tab.name}" getFields():`, e);
                        parserErrorStore.add(parserId, `tab "${tab.name}" getFields`, e);
                        return [];
                    }
                },
            }));
        },
    };
}

/**
 * This class manages all available parsers/plugins
 */
export class ParserManager {

    /**
     * Initializes all registered parsers with the given context
     * @param context Parser context providing utility functions
     * @returns Array of initialized parsers
     */
    initializeParsers(context: IRequestParserContext): IRequestParser[] {
        const initializedParsers: IRequestParser[] = [];

        for (const id in requestParsers) {
            if (Object.prototype.hasOwnProperty.call(requestParsers, id)) {
                try {
                    const parser = requestParsers[id](context);
                    initializedParsers.push(wrapParser(id, parser));
                } catch (e) {
                    console.error(`Failed to initialize parser "${id}":`, e);
                    parserErrorStore.add(id, "initialize", e);
                }
            }
        }

        return initializedParsers;
    }
    private cacheKey = "cached_parsers";

    private parserFiles: { fileName: string, parserIds: string[], fileContent: string }[] = [];

    /**
     * Loads currently stored parsers/plugins making them available for use
     */
    load() {
        let snapshots: IParserSnapshot[] = [];
        try {
            const serializedParsers = localStorage.getItem(this.cacheKey);
            snapshots = serializedParsers ? JSON.parse(serializedParsers) : [];
            if (!Array.isArray(snapshots)) throw new Error("Invalid parser cache");
        } catch (error) {
            parserErrorStore.add("parser cache", "load", error);
            return;
        }

        snapshots.forEach((snapshot, index) => {
            const parserName = snapshot && typeof snapshot.fileName === "string" ? snapshot.fileName : `cached parser ${index + 1}`;
            try {
                if (!snapshot || typeof snapshot.fileName !== "string" || typeof snapshot.fileContent !== "string") {
                    throw new Error("Invalid parser cache entry");
                }
                const cachedParserIds = (snapshot as IParserSnapshot & { parserIds?: string[] }).parserIds;
                if (Array.isArray(cachedParserIds)) cachedParserIds.forEach(id => {
                    if (parserOwners[id] === snapshot.fileName) {
                        delete requestParsers[id];
                        delete parserOwners[id];
                    }
                });
                document.getElementById(snapshot.fileName)?.remove();
                this.save(snapshot.fileName, snapshot.fileContent);
            } catch (error) {
                parserErrorStore.add(parserName, "load", error);
            }
        });

        if (this.parserFiles.length !== snapshots.length) {
            this.persistParserFiles();
        }
    }

    /**
     * Adds parser/plugin
     * @param fileName Parser/plugin file name
     * @param fileContent Parser/plugin JS code
     */
    save(fileName: string, fileContent: string) {
        const existingParserIndex = this.parserFiles.findIndex(p => p.fileName == fileName);
        const existingParser = existingParserIndex === -1 ? undefined : this.parserFiles[existingParserIndex];
        const candidate = this.evaluateParserFile(fileName, fileContent);
        const parserIds = Object.keys(candidate.registrations);
        if (parserIds.length === 0) {
            throw new Error(`Parser file "${fileName}" did not register any parsers`);
        }

        const allowedExistingIds = new Set(existingParser?.parserIds || []);
        const duplicateId = parserIds.find(id => Object.prototype.hasOwnProperty.call(requestParsers, id)
            && !allowedExistingIds.has(id) && parserOwners[id] !== fileName);
        if (duplicateId) {
            throw new Error(`Parser id "${duplicateId}" is already registered`);
        }

        existingParser?.parserIds.forEach(id => {
            delete requestParsers[id];
            if (parserOwners[id] === fileName) delete parserOwners[id];
        });
        document.getElementById(fileName)?.remove();
        Object.assign(requestParsers, candidate.registrations);
        parserIds.forEach(id => parserOwners[id] = fileName);

        const parserFile = {
            fileName,
            fileContent,
            parserIds,
        };
        if (existingParserIndex === -1) this.parserFiles.push(parserFile);
        else this.parserFiles[existingParserIndex] = parserFile;

        this.persistParserFiles();
    }

    /**
     * Removes parser/plugin
     * @param id Id of the parser/plugin to remove
     * @returns void
     */
    remove(id: number) {
        if (!this.parserFiles[id]) {
            console.error("Parser not found: " + id);
            return;
        }

        const existingScript = document.getElementById(this.parserFiles[id].fileName);
        if (existingScript) {
            console.log("Removing paser from dom")
            existingScript.remove();
        }

        // removing all parser ids which were added via this file
        this.parserFiles[id].parserIds.forEach(pid => {
            console.log("Removing paser from list");
            delete requestParsers[pid];
            if (parserOwners[pid] === this.parserFiles[id].fileName) delete parserOwners[pid];
        });

        // removing parser file cache
        this.parserFiles.splice(id, 1);

        console.log("Saving parsers", this.parserFiles)

        this.persistParserFiles();
    }

    /**
     * Gets list of the loaded plugins/parsers
     * @returns List of the loaded parsers/plugins
     */
    getLoadedParsers(): ILoadedParser[] {
        return this.parserFiles.map((p, index) => {
            return {
                id: index,
                fileName: p.fileName,
                parserIds: p.parserIds,
            }
        })
    }

    getParserSnapshots(): IParserSnapshot[] {
        return this.parserFiles.map(({ fileName, fileContent }) => ({ fileName, fileContent }));
    }

    clearPersistedCache() {
        try { localStorage.removeItem(this.cacheKey); } catch { /* Storage may be unavailable. */ }
    }

    replaceParsers(parsers: IParserSnapshot[]) {
        if (!Array.isArray(parsers)) throw new Error("Invalid parser snapshot");
        const fileNames = new Set<string>();
        parsers.forEach(parser => {
            if (!parser || typeof parser.fileName !== "string" || typeof parser.fileContent !== "string" || !parser.fileName.trim()) {
                throw new Error("Invalid parser snapshot entry");
            }
            if (fileNames.has(parser.fileName)) throw new Error(`Duplicate parser file: ${parser.fileName}`);
            fileNames.add(parser.fileName);
            new Function(parser.fileContent);
        });

        const previousParsers = this.getParserSnapshots();
        try {
            this.removeAllParsers();
            parsers.forEach(parser => this.save(parser.fileName, parser.fileContent));
        } catch (error) {
            this.removeAllParsers();
            previousParsers.forEach(parser => this.save(parser.fileName, parser.fileContent));
            throw error;
        }
    }

    private removeAllParsers() {
        while (this.parserFiles.length > 0) this.remove(this.parserFiles.length - 1);
    }

    /**
     * Gets the file content of a loaded parser
     * @param id Id of the parser/plugin
     * @returns File content or null if not found
     */
    getFileContent(id: number): string | null {
        return this.parserFiles[id]?.fileContent ?? null;
    }

    /**
     * Updates parser/plugin content and re-injects it
     * @param id Id of the parser/plugin to update
     * @param fileContent New JS code content
     */
    update(id: number, fileContent: string): boolean {
        if (!this.parserFiles[id]) {
            parserErrorStore.add("unknown", "update", new Error("Parser not found: " + id));
            return false;
        }

        try {
            this.save(this.parserFiles[id].fileName, fileContent);
        } catch (e) {
            parserErrorStore.add(this.parserFiles[id].fileName, "update", e);
            return false;
        }
        return true;
    }

    /**
     * Adds parser/plugin as a SCRIPT to the DOM 
     * @param fileName Name of the plugin file
     * @param fileContent Plugin file content
     */
    private evaluateParserFile(fileName: string, fileContent: string) {
        const registrations: typeof requestParsers = {};
        const originalRegistry = (<any>window)["request_parsers"];
        const execute = new Function("request_parsers", `${fileContent}\n//# sourceURL=flexi-parser://${encodeURIComponent(fileName)}`);
        (<any>window)["request_parsers"] = registrations;
        try {
            execute(registrations);
        } finally {
            (<any>window)["request_parsers"] = originalRegistry;
        }
        return { registrations };
    }

    private persistParserFiles() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.parserFiles));
        } catch (error) {
            parserErrorStore.add("parser cache", "save", error);
        }
    }
}

/**
 * Interface for parser which is fully loaded (added to the DOM)
 */
export interface ILoadedParser {
    id: number;
    fileName: string;
    parserIds: string[];
}