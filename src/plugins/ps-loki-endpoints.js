


(parsersCollection => {
    
    const urlPattern = /(peoplesuggestions|workingwith)/;

    parsersCollection["people-search-loki-endpoints"] = (context) => {
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.method != "OPTIONS" && !!entry.request.url.match(urlPattern)
            },
            getColumnValues(entry) {
    
                return {
                    "Query": "<Not implemented>"
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
                tabs.push(context.getSuggestionsTab(lokiWowiSuggestionsParser));
                return tabs;
            }
        }
    }

    const lokiWowiSuggestionsParser = (response) => {
        if (!response.value) {
            return null;
        }
    
        return response.value.map((v) => ({
            text: v.fullName,
            content: v,
        }));
    }

})(window["request_parsers"]);
