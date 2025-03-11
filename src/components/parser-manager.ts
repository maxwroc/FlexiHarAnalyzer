import { requestParsers } from "../config";


export class ParserManager {
    private cacheKey = "cached_parsers";

    private parserFiles: { fileName: string, parserIds: string[], fileContent: string }[] = [];

    load() {
        const serializedParsers = localStorage.getItem(this.cacheKey);
        if (serializedParsers) {
            this.parserFiles = JSON.parse(serializedParsers);
            this.parserFiles.forEach(p => {
                this.appendToDom(p.fileName, p.fileContent);
            });
        }
    }

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

    getLoadedParsers(): ILoadedParser[] {
        return this.parserFiles.map((p, index) => {
            return {
                id: index,
                fileName: p.fileName,
                parserIds: p.parserIds,
            }
        })
    }

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

export interface ILoadedParser {
    id: number;
    fileName: string;
    parserIds: string[];
}