import { IRequestParser, TabField } from "../config";

export default {
    "people-search-suggestions": <IRequestParser>{
        getColumnsInfo: [
            { name: "Query", defaultWidth: 150 }
        ],
        isRequestSupported(entry) {
            return entry.request.url.includes("/suggestions") && entry.request.method !== "OPTIONS";
        },
        getColumnValues(entry) {

            switch (entry.request.method) {
                case "POST":
                    if (entry.request.postData && entry.request.postData.text) {
                        const requestPostData = JSON.parse(entry.request.postData.text);

                        const queryString = (<Array<any>>requestPostData.EntityRequests).find(er => er.EntityType == "People").Query.QueryString;

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
        getCustomTabs() {
            return [
                {
                    name: "People search",
                    getFields(entry) {

                        const tabFields: TabField[] = [];

                        let upn = "";
                        let query = "";
                        let sources = "";
                        let peopleEntityRequest: any;
                        let appNameScenario = "";

                        switch (entry.request.method) {
                            case "GET":
                                const url = new URL(entry.request.url);
                                query = url.searchParams.get("query")!;
                                appNameScenario = url.searchParams.get("scenario")!;
                                break;
                            case "POST":
                                if (entry.request.postData?.text) {
                                    const postData = JSON.parse(entry.request.postData?.text);

                                    peopleEntityRequest = (<Array<any>>postData.EntityRequests).find(er => er.EntityType == "People");

                                    query = peopleEntityRequest.Query.QueryString;

                                    sources = peopleEntityRequest.Provenances.join(", ");

                                    if (postData.AppName) {
                                        appNameScenario = postData.AppName + " / "
                                    }

                                    appNameScenario += postData.Scenario.Name;
                                }
                                break;
                            default:
                                console.log("Not supported request method: " + entry.request.method);
                        }


                        const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value as string;
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
                            tabFields.push({ type: "json", label: "People request", value: peopleEntityRequest });
                        }

                        tabFields.push({ type: "text", label: "Logged-in user", value: upn });

                        return tabFields;
                    },
                },
                {
                    name: "Suggestions",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        if (!entry.response.content.text) {
                            return fields;
                        }

                        const response = JSON.parse(entry.response.content.text);

                        const entityTypesCounts = response.Groups.map((g: any) => ({ type: g.Type, count: g.Suggestions.length }));
                        if (entityTypesCounts && entityTypesCounts.length) {
                        fields.push({
                            type:"table", 
                            label: "Entity types", 
                            headers: [{ name: "Type", key: "type" }, { name: "Count", key: "count" }], 
                            values: entityTypesCounts})
                        }

                        const peopleResults = response.Groups.find((g: any) => g.Type == "People");

                        fields.push({ type: "header", label: "People suggestions" });

                        if (peopleResults) {

                            peopleResults.Suggestions.forEach((suggestion: any) => {
                                fields.push({
                                    type: "container",
                                    style: "accordeon",
                                    label: suggestion.Text,
                                    fields: [
                                        {
                                            // type: "table",
                                            // headers: [
                                            //     { name: "Name", key: "name", width: 220 },
                                            //     { name: "Value", key: "value", copyButton: true },
                                            // ],
                                            // values: Object.keys(suggestion).map(k => ({
                                            //     name: k,
                                            //     value: Array.isArray(suggestion[k]) ? suggestion[k].join(", ") : suggestion[k],
                                            // }))
                                            type: "json",
                                            value: suggestion,
                                        }
                                    ]
                                });
                            })
                        }
                        else {
                            fields.push({ type: "label", label: "No people results" });
                        }

                        return fields;
                    },
                }
            ]
        }
    }
}