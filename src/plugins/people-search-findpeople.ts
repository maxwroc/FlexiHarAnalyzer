import { JsonViewer } from "sonj-review";
import { IRequestParser, TabField } from "../config";

export default {
    "people-search-findpeople": <IRequestParser>{
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("?action=FindPeople");
            },
            getColumnValues(entry) {
                const encodedPostData = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;

                if (encodedPostData) {
                    const postData = JSON.parse(decodeURIComponent(encodedPostData));
                    const queryString = postData.Body.QueryString === null ? "<null>" : postData.Body.QueryString;
                    return {
                        "Query": queryString
                    }
                }

                return {
                    "Query": "<fail>"
                };
            },
            getCustomTabs() {
                return [
                    {
                        name: "People search",
                        getFields(entry) {

                            const tabFields: TabField[] = [];

                            tabFields.push({ type: "text", label: "API", value: "FindPeople" });

                            const encodedPostData = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;

                            if (encodedPostData) {
                                const postData = JSON.parse(decodeURIComponent(encodedPostData));

                                const appName = postData.Body.Context.find((f: any) => f.Key == "AppName")?.Value;
                                const scenario = postData.Body.Context.find((f: any) => f.Key == "AppScenario")?.Value;
                            
                                tabFields.push({ type: "text", label: "App name / scenario", value: appName + " / " + scenario });

                                tabFields.push({ type: "text", label: "Query", value: postData.Body.QueryString ?? "<null>" });
                                tabFields.push({ type: "text", label: "Sources", value: postData.Body.QuerySources?.join(", ") ?? "<null>" });
                                tabFields.push({ type: "text", label: "SearchPeopleSuggestionIndex", value: postData.Body.SearchPeopleSuggestionIndex ?? "<null>" });
                            }

                            return tabFields;
                        },
                    },
                    {
                        name: "Post data",
                        getFields(entry) {

                            const encodedPostData = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;

                            if (encodedPostData) {
                                return [
                                    { type: "json", value: JSON.parse(decodeURIComponent(encodedPostData)) }
                                ]
                            }


                            return [];
                        },
                    }
                ]
            }
        }
}