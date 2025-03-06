

(parsersCollection => {
    
    const urlPattern = /(v1\.0|\/users)\/[^/]+\/people/;

    parsersCollection["people-search-people"] = (context) => {
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.method != "OPTIONS" && !!entry.request.url.match(urlPattern)
            },
            getColumnValues(entry) {
    
                if (entry.request.method == "GET") {
                    const url = new URL(entry.request.url);
                    return {
                        "Query": url.searchParams.get("$search")
                    };
                }
    
                return {
                    "Query": "<null>"
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
    
                // tabs.push(peopleSearchTab);
                tabs.push(context.getSuggestionsTab(graphPeopleSuggestionConverter));
                // tabs.push(kustoTab);
    
                return tabs;
            }
        }
    }
    
    const graphPeopleSuggestionConverter = (response) => {
        if (!response.value) {
            return null;
        }
    
        return response.value.map((v) => ({
            text: `${v.displayName} <${v.userPrincipalName}>`,
            content: v,
        }));
    }

})(window["request_parsers"]);
