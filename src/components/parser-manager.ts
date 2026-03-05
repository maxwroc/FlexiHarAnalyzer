import { requestParsers } from "../config";

/**
 * This class manages all available parsers/plugins
 */
export class ParserManager {
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