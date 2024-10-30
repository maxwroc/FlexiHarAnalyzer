import { Content } from "har-format";
import { IRequestParser, TabField } from "../config";

export default {
    "people-search-suggestions": <IRequestParser>{
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
                            tabFields.push({ type: "json", label: "People request", value: peopleEntityRequest, options: { teaserFields: ["QueryString", "Term"] } });
                        }

                        tabFields.push({ type: "text", label: "Logged-in user", value: upn });

                        return tabFields;
                    },
                },
                {
                    name: "Suggestions",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        const response = getJsonContent(entry.response.content);
                        if (!response) {
                            return fields;
                        }

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
                },
                {
                    name: "Kusto",
                    getFields(entry) {
                        const tabFields: TabField[] = [];

                        const requestTime = entry.response.headers.find(h => h.name == "date")?.value as string;
                        if (requestTime) {
                            tabFields.push({ type: "text", label: "Request time", value: requestTime });

                            const oneDay = 1000 * 60 * 60 * 24;
                            const diffInTime = new Date().getTime() - Date.parse(requestTime);
                            let daysAgo = Math.round(diffInTime / oneDay);
                            tabFields.push({ type: "text", label: "Request time (days ago)", value: daysAgo });
                        }

                        const serverRequestId = entry.response.headers.find(h => h.name == "request-id")?.value as string;

                        tabFields.push({ type: "text", label: "Request ID", value: serverRequestId });

                        if (requestTime && serverRequestId) {

                            const parsedTime = new Date(Date.parse(requestTime));

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
                }
            ]
        }
    }
}

const getJsonContent = (content: Content) => {
    if (!content.mimeType.includes("application/json") || !content.text) {
        return null;
    }

    try {
        let data = content.text;
        if (content.encoding == "base64") {
            data = atob(data);
        }

        return JSON.parse(data);
    }
    catch (e) {
        console.error("Failed to parse response", e);
    }

    return null;
}