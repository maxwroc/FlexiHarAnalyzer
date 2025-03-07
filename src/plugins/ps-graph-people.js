

(parsersCollection => {
    
    const urlPattern = /(v1\.0|\/users)\/[^/]+\/people/;

    parsersCollection["people-search-graph-people"] = (context) => {
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
                tabs.push(kustoTab);
    
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

    const kustoTab = {
        name: "Kusto",
        getFields(entry) {
            const tabFields = [];
    
            const requestTime = entry.response.headers.find(h => h.name.toLowerCase() == "date")?.value;
            if (requestTime) {
                tabFields.push({ type: "text", label: "Request time", value: requestTime });
    
                const oneDay = 1000 * 60 * 60 * 24;
                const diffInTime = new Date().getTime() - Date.parse(requestTime);
                let daysAgo = Math.round(diffInTime / oneDay);
                tabFields.push({ type: "text", label: "Request time (days ago)", value: daysAgo });
            }
    
            const serverRequestId = entry.response.headers.find(h => h.name == "request-id")?.value;
            tabFields.push({ type: "text", label: "Request ID", value: serverRequestId });
    
            const clientRequestId = entry.response.headers.find(h => h.name == "client-request-id")?.value;
            tabFields.push({ type: "text", label: "Client request ID", value: clientRequestId });
    
            if (requestTime && serverRequestId) {
                const kustoQuery = `let clientRequest = tolower("${clientRequestId}");
                let requestDate = datetime(${requestTime});
                let startTime = datetime_add("Minute", -5, requestDate);
                let endTime = datetime_add("Minute", 5, requestDate);
                cluster('o365monweu.westeurope.kusto.windows.net').database('o365monitoring').PeopleQueryLogEntryEvent_Global
                | where env_time between (startTime .. endTime)
                | where ClientRequestId == clientRequest 
                | project-reorder env_time, MailboxGuid, QueryScenario, IsPublicDataQuery, Top, Skip, PersonQueryLength, UserSpecifiedSourceNames, ReturnedResultCount, RemovedMaskedContactsCount
                | take 5`;
    
                
                tabFields.push({ type: "large-text", label: "Kusto query", value: kustoQuery.replace(/^\s+/gm, '') });
            }
    
            return tabFields;
        }
    }

})(window["request_parsers"]);
