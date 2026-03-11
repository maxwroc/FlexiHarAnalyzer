import { Entry } from "har-format";
import { CustomTab, IRequestParser, IRequestParserContext, requestParsers } from "../types/config";
import { parserErrorStore } from "./parser-error-store";

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

            return tabs.map(tab => ({
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
        const serializedParsers = localStorage.getItem(this.cacheKey);
        if (serializedParsers) {
            this.parserFiles = JSON.parse(serializedParsers);
            this.parserFiles.forEach(p => {
                this.appendToDom(p.fileName, p.fileContent);
            });
        }
    }

    /**
     * Adds parser/plugin
     * @param fileName Parser/plugin file name
     * @param fileContent Parser/plugin JS code
     */
    save(fileName: string, fileContent: string) {

        const existingParserIndex = this.parserFiles.findIndex(p => p.fileName == fileName);
        if (existingParserIndex != -1) {
            console.log("Removing exisitng parser", this.parserFiles[existingParserIndex]);
            this.remove(existingParserIndex);
        }

        const parserListBefore = Object.keys(requestParsers);
        this.appendToDom(fileName, fileContent);

        const parserIds = Object.keys(requestParsers).filter(id => !parserListBefore.includes(id));

        this.parserFiles.push({
            fileName,
            fileContent,
            parserIds,
        });

        localStorage.setItem(this.cacheKey, JSON.stringify(this.parserFiles));
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
        });

        // removing parser file cache
        this.parserFiles.splice(id, 1);

        console.log("Saving parsers", this.parserFiles)

        localStorage.setItem(this.cacheKey, JSON.stringify(this.parserFiles));
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
    update(id: number, fileContent: string) {
        if (!this.parserFiles[id]) {
            parserErrorStore.add("unknown", "update", new Error("Parser not found: " + id));
            return;
        }

        const oldData = { ...this.parserFiles[id] };
        const fileName = oldData.fileName;

        // Syntax check before modifying anything
        try {
            new Function(fileContent);
        } catch (e) {
            parserErrorStore.add(fileName, "update (syntax check)", e);
            return;
        }

        // Remove old parser registrations
        oldData.parserIds.forEach(pid => {
            delete requestParsers[pid];
        });

        // Remove old script from DOM
        const existingScript = document.getElementById(fileName);
        if (existingScript) {
            existingScript.remove();
        }

        // Re-inject with new content
        const parserListBefore = Object.keys(requestParsers);
        this.appendToDom(fileName, fileContent);
        const parserIds = Object.keys(requestParsers).filter(id => !parserListBefore.includes(id));

        // If old code registered parsers but new code didn't, revert
        if (oldData.parserIds.length > 0 && parserIds.length === 0) {
            const brokenScript = document.getElementById(fileName);
            if (brokenScript) brokenScript.remove();

            const beforeRevert = Object.keys(requestParsers);
            this.appendToDom(fileName, oldData.fileContent);
            const revertedIds = Object.keys(requestParsers).filter(pid => !beforeRevert.includes(pid));
            this.parserFiles[id] = { ...oldData, parserIds: revertedIds };

            parserErrorStore.add(fileName, "update", new Error("Parser code did not register any parsers"));
            return;
        }

        // Update stored data
        this.parserFiles[id] = { fileName, fileContent, parserIds };
        localStorage.setItem(this.cacheKey, JSON.stringify(this.parserFiles));
    }

    /**
     * Adds parser/plugin as a SCRIPT to the DOM 
     * @param fileName Name of the plugin file
     * @param fileContent Plugin file content
     */
    private appendToDom(fileName: string, fileContent: string) {

        const existingScript = document.getElementById(fileName);
        if (existingScript) {
            existingScript.remove();
        }

        const newScript = document.createElement("script");
        newScript.setAttribute("id", fileName);
        newScript.textContent = fileContent;
        document.head.appendChild(newScript);
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