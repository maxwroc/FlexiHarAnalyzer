import { Entry } from "har-format";
import { Component } from "preact";
import { CustomTab, IRequestParser } from "../config";
import { ISearchResult } from "../components/search-engine";
import { GenericTab } from "./tabs/generic-tab";
import { SearchTab } from "./tabs/search-tab";

interface IRequestViewerProps {
    entry: Entry | undefined;
    entryIndex: number;
    parsers: IRequestParser[];
    searchResult: ISearchResult | undefined;
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

        // Auto-select Search tab when entry is a search match
        if (showSearchTab) {
            lastActiveTab = "Search";
        }

        // If Search tab was selected but is no longer available, fall back to first tab
        if (!showSearchTab && lastActiveTab === "Search") {
            lastActiveTab = tabs.length > 0 ? tabs[0].name : "";
        }

        let activeTabIndex = tabs.findIndex(t => t.name == lastActiveTab);
        if (activeTabIndex == -1 && lastActiveTab !== "Search") {
            activeTabIndex = 0;
        }

        return (
            <div>
                <div role="tablist" class="tabs tabs-lifted">
                    {showSearchTab && <SearchTab
                        entry={entry}
                        searchResult={this.props.searchResult!}
                        isActive={lastActiveTab === "Search"}
                        onTabClick={() => lastActiveTab = "Search"}
                    />}
                    {tabs.map((t, i) => <GenericTab
                        tab={t}
                        entry={entry}
                        isActive={showSearchTab
                            ? (lastActiveTab === t.name && lastActiveTab !== "Search")
                            : i == activeTabIndex}
                        onTabClick={() => lastActiveTab = t.name}
                    />)}
                </div>
            </div>
        )
    }
}

let lastActiveTab: string;