


(parsersCollection => {
    
    const urlPattern = /(v1\.0|\/users)\/[^/]+\/people/;

    parsersCollection["people-search-teams-mt"] = (context) => {
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.method === "POST" && entry.request.url.includes("/searchV2");
            },
            getColumnValues(entry) {
                return {
                    "Query": entry.request.postData?.text
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
    
                tabs.push(teamsMtTab);
                tabs.push(context.getSuggestionsTab(mtPeopleSuggestionConverter));
                tabs.push(tokenTab);
    
                return tabs;
            }
        }
    }
    
    const mtPeopleSuggestionConverter = (response) => {
        if (!response.value) {
            return null;
        }
    
        return response.value.map((v) => ({
            text: `${v.displayName} <${v.userPrincipalName}>`,
            content: v,
        }));
    }

    const teamsMtTab = {
        name: "Teams MT",
        getFields(entry) {

            const tabFields = [];
            let daysAgo = -1;

            const requestTime = entry.response.headers.find(h => h.name == "date")?.value;
            if (requestTime) {
                tabFields.push({ type: "text", label: "Request time", value: requestTime });

                const oneDay = 1000 * 60 * 60 * 24;
                const diffInTime = new Date().getTime() - Date.parse(requestTime);
                daysAgo = Math.round(diffInTime / oneDay);
                tabFields.push({ type: "text", label: "Request time (days ago)", value: daysAgo });
            }

            const serverRequestId = entry.response.headers.find(h => h.name == "x-serverrequestid")?.value;

            tabFields.push({ type: "text", label: "X-ServerRequestId", value: serverRequestId });

            if (serverRequestId) {
                
                // adding dashes to the guid
                const dashedGuid  =[8,4,4,4,12].reduce((acc,v,i) => {
                    let pos = acc.length - (i > 1 ? i - 1 : 0);
                    let dash = i != 0 ? "-" : "";
                    acc += dash + serverRequestId.substring(pos, pos + v);
                    return acc;
                }, "")

                tabFields.push({ type: "text", label: "3S Request ID", value: dashedGuid.toLowerCase() });
            }

            if (serverRequestId && requestTime) {

                const maxDays = 60;
                tabFields.push({
                    type: "link",
                    href: daysAgo > maxDays ? "#" : "https://dataexplorer.azure.com/dashboards/c2e86f03-fd9b-425d-8c9d-808fee4ed649?p-_startTime=60days&p-_endTime=now&p-correlation_tag=v-" + serverRequestId,
                    text: "MT Correlation Tag Lookup - " + (daysAgo > maxDays ? "Logs purged" : serverRequestId),
                });

                tabFields.push({
                    type: "large-text",
                    value: "Kusto"
                })
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
    };

})(window["request_parsers"]);
