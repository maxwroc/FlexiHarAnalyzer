import { ICustomTabField, IRequestPerser } from "../config";

export default {
    "people-search": <IRequestPerser>{
        getColumnsInfo: [
            { name: "Query", defaultWidth: 150 }
        ],
        isRequestSupported(entry) {
            return entry.request.url.includes("/suggestions");
        },
        getColumnValues(entry) {

            switch (entry.request.method) {
                case "POST":
                    if (entry.request.postData && entry.request.postData.text) {
                        const requestPostData = JSON.parse(entry.request.postData.text);

                        console.log("People request", (<Array<any>>requestPostData.EntityRequests).find(er => er.EntityType == "People"))

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

                        const tabFields: ICustomTabField[] = [];

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
                }
            ]
        }
    }
}