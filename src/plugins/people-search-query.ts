import { IRequestParser, TabField } from "../config";

export default {
    "people-search-query": <IRequestParser>{
        getColumnsInfo: [
            { name: "Query", defaultWidth: 150 }
        ],
        isRequestSupported(entry) {
            return entry.request.url.includes("/search/api/v2/query");
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
                                break;
                            case "POST":
                                if (entry.request.postData?.text) {
                                    const postData = JSON.parse(entry.request.postData?.text);

                                    peopleEntityRequest = (<Array<any>>postData.EntityRequests).find(er => er.EntityType == "People");

                                    query = peopleEntityRequest.Query.QueryString;

                                    sources = peopleEntityRequest.Provenances.join(", ");

                                    appNameScenario = postData.AppName + " / " + postData.Scenario.Name;
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

                        tabFields.push({ type: "json", label: "People request", value: peopleEntityRequest })

                        tabFields.push({ type: "text", label: "Logged-in user", value: upn });

                        return tabFields;
                    },
                },
                {
                    name: "Suggestions",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        const response = JSON.parse(entry.response.content.text!);

                        const peopleResults = response.EntitySets.find((entitySet: any) => entitySet.EntityType == "People")

                        if (peopleResults) {
                            peopleResults.ResultSets[0].Results.forEach((suggestion: any) => {
                                fields.push({
                                    type: "container",
                                    style: "accordeon",
                                    label: suggestion.Source.Text,
                                    fields: [
                                        {
                                            type: "table",
                                            headers: [
                                                { name: "Name", key: "name", width: 220 },
                                                { name: "Value", key: "value", copyButton: true },
                                            ],
                                            values: Object.keys(suggestion.Source).map(k => ({
                                                name: k,
                                                value: Array.isArray(suggestion.Source[k]) ? suggestion.Source[k].join(", ") : suggestion.Source[k],
                                            }))
                                        }
                                    ]
                                })
                            })
                        }
                        else {
                            console.log(response)
                        }

                        return fields;
                    },
                }
            ]
        }
    }
}