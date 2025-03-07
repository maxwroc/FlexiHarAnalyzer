


(parsersCollection => {

    parsersCollection["people-search-3s-query"] = (context) => {
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("/search/api/v2/query")
                    || entry.request.url.includes("/searchservice/api/v2/query");
            },
            getColumnValues(entry) {
                switch (entry.request.method) {
                    case "POST":
                        if (entry.request.postData && entry.request.postData.text) {
                            const requestPostData = JSON.parse(entry.request.postData.text);
    
                            if (requestPostData && requestPostData.EntityRequests) {
                                const peopleEntityRequest = (requestPostData.EntityRequests).find(er => er.EntityType == "People" || er.entityType == "People");
    
                                if (peopleEntityRequest) {
                                    return {
                                        "Query": peopleEntityRequest.Query?.QueryString || peopleEntityRequest.query?.queryString
                                    }
                                }
                            }
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
                    "Query": "<Not People Request>"
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
    
                tabs.push(peopleSearchTab);
                tabs.push(context.getSuggestionsTab(graphPeopleSuggestionConverter));
                // tabs.push(kustoTab);
    
                return tabs;
            }
        }
    }


    
    const graphPeopleSuggestionConverter = (response) => {
        const peopleResults = response.EntitySets.find((entitySet) => entitySet.EntityType == "People");
        if (!peopleResults) {
            return null;
        }

    
        return peopleResults.ResultSets[0].Results.map((v) => ({
            text: (v.Source.Text || v.Source.DisplayName) + (v.Source.UserPrincipalName ? ` (${v.Source.UserPrincipalName})` : ""),
            content: v,
        }));
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
                    break;
                case "POST":
                    if (entry.request.postData?.text) {
                        const postData = JSON.parse(entry.request.postData?.text);

                        peopleEntityRequest = (postData.EntityRequests).find(er => er.EntityType == "People" || er.entityType == "People");

                        if (peopleEntityRequest) {
                            query = peopleEntityRequest.Query?.QueryString || peopleEntityRequest.query?.queryString;

                            sources = (peopleEntityRequest.Provenances || peopleEntityRequest.provenances)?.join(", ");
                        }

                        if (postData.AppName || postData.appName) {
                            appNameScenario = (postData.AppName || postData.appName) + " / ";
                        }

                        appNameScenario += (postData.Scenario || postData.scenario)?.Name || "";
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

            tabFields.push({ type: "json", label: "People request", value: peopleEntityRequest })

            tabFields.push({ type: "text", label: "Logged-in user", value: upn });

            return tabFields;
        },
    }

})(window["request_parsers"]);
