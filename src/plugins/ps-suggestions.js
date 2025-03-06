

let parsersCollection = window["request_parsers"];

console.log("ps-suggestions.js", parsersCollection);

parsersCollection["people-search-suggetions"] = (context) => {

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

            // tabs.push(peopleSearchTab);
            tabs.push(context.getSuggestionsTab(suggestionViewConverter));
            // tabs.push(kustoTab);

            const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value;
            if (tokenHeader) {
                tabs.push(tokenTab);
            }

            return tabs;
        }
    }
}



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