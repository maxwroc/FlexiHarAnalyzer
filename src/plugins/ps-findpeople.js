

(parsersCollection => {

    parsersCollection["people-search-findpeople"] = (context) => {
        return {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("?action=FindPeople");
            },
            getColumnValues(entry) {
                let queryString = "<fail>";

                const postData = getPostData(entry);
                if (postData) {
                    switch (postData.Body.QueryString) {
                        case null:
                            queryString = "<null>";
                            break;
                        case undefined:
                            queryString = "<no query>";
                            break;
                        default:
                            queryString = postData.Body.QueryString;

                    }
                }

                return {
                    "Query": queryString,
                };
            },
            getCustomTabs(entry) {
    
                const tabs = [];
    
                tabs.push(peopleSearchTab);
                tabs.push(context.getSuggestionsTab(findPeopleSuggestionConverter));
                tabs.push(postDataTab);
    
                return tabs;
            }
        }
    }
    
    const findPeopleSuggestionConverter = (response) => {
        if (!response.Body?.ResultSet) {
            return null;
        }
    
        return response.Body.ResultSet.map((v) => ({
            text: `${v.DisplayName}`,
            content: v,
        }));
    }

    const peopleSearchTab = {
        name: "People search",
        getFields(entry) {

            const tabFields = [];

            tabFields.push({
                type: "text",
                value: entry.startedDateTime,
                label: "Request init time",
            })

            tabFields.push({ type: "text", label: "API", value: "FindPeople" });

            const postData = getPostData(entry);

            if (postData) {
                const appName = postData.Body.Context.find((f) => f.Key == "AppName")?.Value;
                const scenario = postData.Body.Context.find((f) => f.Key == "AppScenario")?.Value;
            
                tabFields.push({ type: "text", label: "App name / scenario", value: appName + " / " + scenario });

                tabFields.push({ type: "text", label: "Query", value: postData.Body.QueryString ?? "<null>" });
                tabFields.push({ type: "text", label: "Sources", value: postData.Body.QuerySources?.join(", ") ?? "<null>" });
                tabFields.push({ type: "text", label: "SearchPeopleSuggestionIndex", value: postData.Body.SearchPeopleSuggestionIndex ?? "<null>" });

                tabFields.push({
                    type: "table",
                    headers: [
                        { name: "Name", key: "param", width: 300 },
                        { name: "Value", key: "value" },
                    ],
                    values: [
                        { param: "IndexedPageItemView.MaxEntriesReturned", value: postData.Body.IndexedPageItemView?.MaxEntriesReturned ?? "" },
                        { param: "IndexedPageItemView.Offset", value: postData.Body.IndexedPageItemView?.Offset ?? "" },
                        { param: "ParentFolderId.BaseFolderId.__type", value: postData.Body.ParentFolderId?.BaseFolderId?.__type ?? "" },
                        { param: "ParentFolderId.BaseFolderId.Id", value: postData.Body.ParentFolderId?.BaseFolderId?.Id ?? "" },
                        { param: "SortOrder[0].Order", value: postData.Body.SortOrder ? postData.Body.SortOrder[0]?.Order : "" },
                        { param: "SortOrder[0].Path.FieldURI", value: postData.Body.SortOrder ? postData.Body.SortOrder[0]?.Path.FieldURI : "" },
                    ],
                    label: "Other request params"
                })
            }

            return tabFields;
        },
    };

    const postDataTab = {
        name: "Post data",
        getFields(entry) {

            const postData = getPostData(entry)

            if (postData) {
                return [
                    { type: "json", value: postData, options: { autoExpand: 10 } }
                ]
            }


            return [];
        },
    };

    const getPostData = (entry) => {

        if (entry.request.method != "POST") {
            return null;
        }
    
        let postBody;
    
        if (entry.request.postData && entry.request.postData.text) {
            postBody = entry.request.postData.text;
        }
        else {
            const postBodyRaw = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;
            if (postBodyRaw) {
                postBody = decodeURIComponent(postBodyRaw);
            }
        }
    
        if (postBody) {
            return JSON.parse(postBody);
        }
    
        return undefined
    }

})(window["request_parsers"]);
