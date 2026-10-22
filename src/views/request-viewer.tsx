import { Entry } from "har-format";
import { Component } from "preact";
import { CustomTab, IRequestParser } from "../types/config";
import { ISearchResult } from "../services/search-engine";
import { GenericTab } from "./tabs/generic-tab";
import { SearchTab } from "./tabs/search-tab";

interface IRequestViewerProps {
    entry: Entry | undefined;
    entryIndex: number;
    parsers: IRequestParser[];
    searchResult: ISearchResult | undefined;
    activeTab: string;
    onActiveTabChange: (activeTab: string) => void;
}

export class RequestViewer extends Component<IRequestViewerProps> {
    render() {
        const entry = this.props.entry;

        if (!entry || !entry.request) {
            return <div>Select request</div>
        }

        const tabs = this.props.parsers.reduce((acc, parser) => {

                if (parser.isRequestSupported(entry)) {
                    const parserTabs = parser.getCustomTabs(entry);
                    if (parserTabs) {
                        acc.push(...parserTabs.filter(t => !!t));
                    }
                }

                return acc;
            }, [] as CustomTab[]);

        const showSearchTab = this.props.searchResult
            && this.props.entryIndex >= 0
            && this.props.searchResult.matchingIndices.has(this.props.entryIndex);

        const requestedTab = this.props.activeTab;
        const activeTab = requestedTab === "Search" && showSearchTab
            ? "Search"
            : (tabs.some(tab => tab.name === requestedTab) ? requestedTab : tabs[0]?.name || "");

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {showSearchTab && <SearchTab
                        entry={entry}
                        searchResult={this.props.searchResult!}
                        isActive={activeTab === "Search"}
                        onTabClick={() => this.props.onActiveTabChange("Search")}
                    />}
                    {tabs.map((t, i) => <GenericTab
                        tab={t}
                        entry={entry}
                        isActive={activeTab === t.name || (!activeTab && i === 0)}
                        onTabClick={() => this.props.onActiveTabChange(t.name)}
                    />)}
                </div>
            </div>
        )
    }
}