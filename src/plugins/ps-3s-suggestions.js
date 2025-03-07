

(parsersCollection => {
    parsersCollection["people-search-3s-suggetions"] = (context) => {

        // adding method to a shared space to be available to use in other plugins
        context["getSuggestionsTab"] = (suggestionParser) => getSuggestionsTab(context, suggestionParser);
    
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("/search/api/v1/suggestions") && entry.request.method !== "OPTIONS";
            },
            getColumnValues(entry) {
    
                switch (entry.request.method) {
                    case "POST":
                        if (entry.request.postData && entry.request.postData.text) {
                            const requestPostData = JSON.parse(entry.request.postData.text);
    
                            const queryString = requestPostData.EntityRequests.find(er => er.EntityType == "People").Query.QueryString;
    
                            return {
                                "Query": queryString
                            };
                        }
                        break;
                    case "GET":
                        const url = new URL(entry.request.url);
                        return {
                            "Query": url.searchParams.get("query")
                        };
    
                        break;
                    default:
                        console.log("Unsupported request methid: " + entry.request.method)
                }
    
                return {
                    "Query": "Fail"
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
    
                tabs.push(peopleSearchTab);
                tabs.push(context.getSuggestionsTab(suggestionViewConverter));
                tabs.push(kustoTab);
    
                const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value;
                if (tokenHeader) {
                    tabs.push(tokenTab);
                }
    
                return tabs;
            }
        }
    }

    const peopleSearchTab = {
        name: "People search",
        getFields(entry) {
    
            const tabFields = [];
    
            let upn = "";
            let query = "";
            let sources = "";
            let peopleEntityRequest;
            let appNameScenario = "";
    
            switch (entry.request.method) {
                case "GET":
                    const url = new URL(entry.request.url);
                    query = url.searchParams.get("query");
                    appNameScenario = url.searchParams.get("scenario");
                    break;
                case "POST":
                    if (entry.request.postData?.text) {
                        const postData = JSON.parse(entry.request.postData?.text);
    
                        peopleEntityRequest = postData.EntityRequests.find(er => er.EntityType == "People");
    
                        query = peopleEntityRequest.Query.QueryString;
    
                        sources = peopleEntityRequest.Provenances?.join(", ");
    
                        if (postData.AppName) {
                            appNameScenario = postData.AppName + " / "
                        }
    
                        appNameScenario += postData.Scenario.Name;
                    }
                    break;
                default:
                    console.log("Not supported request method: " + entry.request.method);
            }
    
    
            const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value;
            if (tokenHeader) {
                // getting base64 encoded chunks
                let token = tokenHeader.split(" ").pop();
                if (token) {
                    // we should have 3 chunks
                    const tokenChunks = token.split(".");
                    if (tokenChunks.length == 3) {
    
                        try {
                            const decodedToken = atob(tokenChunks[1]);
                            let pos = decodedToken.indexOf("\"upn\":\"");
                            if (pos) {
                                pos += 7;
                                upn = decodedToken.substring(pos, decodedToken.indexOf("\"", pos));
                            }
                        }
                        catch (e) {
                            console.log("Failed to decode token")
                        }
                    }
                }
            }
    
    
    
            tabFields.push({ type: "text", label: "API", value: "Suggestions" });
            tabFields.push({ type: "text", label: "App name / scenario", value: appNameScenario });
            tabFields.push({ type: "text", label: "Query", value: query });
            tabFields.push({ type: "text", label: "Sources", value: sources });
    
            if (peopleEntityRequest) {
                tabFields.push({ type: "json", label: "People request", value: peopleEntityRequest, options: { teaserFields: ["QueryString", "Term"] } });
            }
    
            tabFields.push({ type: "text", label: "Logged-in user", value: upn });
    
            return tabFields;
        },
    };

    const kustoTab = {
        name: "Kusto",
        getFields(entry) {
            const tabFields = [];
    
            const requestTime = entry.response.headers.find(h => h.name == "date")?.value;
            if (requestTime) {
                tabFields.push({ type: "text", label: "Request time", value: requestTime });
    
                const oneDay = 1000 * 60 * 60 * 24;
                const diffInTime = new Date().getTime() - Date.parse(requestTime);
                let daysAgo = Math.round(diffInTime / oneDay);
                tabFields.push({ type: "text", label: "Request time (days ago)", value: daysAgo });
            }
    
            const serverRequestId = entry.response.headers.find(h => h.name == "request-id")?.value;
    
            tabFields.push({ type: "text", label: "Request ID", value: serverRequestId });
    
            if (requestTime && serverRequestId) {
    
                const kustoQuery = `let request = tolower("${serverRequestId}");
                let requestDate = datetime(${requestTime});
                let startTime = datetime_add("Minute", -5, requestDate);
                let endTime = datetime_add("Minute", 5, requestDate);
                cluster("SubstrateSearch.Kusto.windows.net").database("SubstrateSearchExceptionEvent").SubstrateSearchInfoEvent_Global_Full_VDIOnly
                | union cluster("SubstrateSearch.Kusto.windows.net").database("SubstrateSearchExceptionEvent").SubstrateSearchExceptionEvent_Global_Full_VDIOnly
                | where env_time between (startTime .. endTime)
                | where TransactionId == request or ClientRequestId == request or TraceId == request
                | project-reorder env_time, ClientRequestId, TransactionId, TraceId, UserMailboxGuid, UserMailboxType, RouteAction, AppScenario, RoutingKeyContent, QueryLength, ResultCount, Exception, FilterData, Provenance, ClientVersion, ResponseMetaJson, DiagnosticData
                | order by env_time asc
                | take 10`;
    
                
                tabFields.push({ type: "large-text", label: "Kusto query", value: kustoQuery.replace(/^\s+/gm, '') });
            }
    
            return tabFields;
        },
    };
    
    const tokenTab = {
        name: "Token",
        getFields(entry) {
            const fields = [];
    
            const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value;
            if (tokenHeader) {
                // getting base64 encoded chunks
                let token = tokenHeader.split(" ").pop();
                if (token) {
                    // we should have 3 chunks
                    const tokenChunks = token.split(".");
                    if (tokenChunks.length == 3) {
    
                        try {
                            const decodedToken = atob(tokenChunks[1]);
                            fields.push({
                                type: "json",
                                value: JSON.parse(decodedToken),
                            })  
                        }
                        catch (e) {
                            console.log("Failed to decode token")
                        }
                    }
                }
            }
    
            return fields;
        },
    }
    
    const getSuggestionsTab = (context, parser) => {
        return {
            name: "Suggestions",
            getFields(entry) {
                const fields = [];
    
                const response = context.getJsonContent(entry.response.content);
                if (!response) {
                    return fields;
                }
    
                const peopleResults = parser(response);
    
                if (!peopleResults) {
                    return fields;
                }
    
                fields.push({ type: "header", label: "People suggestions" });
    
                if (peopleResults) {
    
                    peopleResults.forEach(suggestion => {
                        fields.push({
                            type: "container",
                            style: "accordeon",
                            label: suggestion.text,
                            fields: [
                                {
                                    type: "json",
                                    value: suggestion.content,
                                }
                            ]
                        });
                    })
                }
                else {
                    fields.push({ type: "label", label: "No people results" });
                }
    
                return fields;
            }
        }
    }
    
    const suggestionViewConverter = (response) => {
        if (!response.Groups) {
            return null;
        }
    
        const peopleResults = response.Groups.find((g) => g.Type == "People");
    
        if (!peopleResults) {
            return null;
        }
    
        return peopleResults.Suggestions.map(s => ({
            text: (s.Text || s.DisplayName) + (s.UserPrincipalName ? ` (${s.UserPrincipalName})` : ""),
            content: s,
        }));
    }

})(window["request_parsers"])


