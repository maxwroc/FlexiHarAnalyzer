import { IRequestParser, TabField } from "../config";
import { Entry } from "har-format";

export default {
    "people-search-findpeople": <IRequestParser>{
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("?action=FindPeople");
            },
            getColumnValues(entry) {

                
                let queryString: string = "<fail>";

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
            getCustomTabs() {
                return [
                    {
                        name: "People search",
                        getFields(entry) {

                            const tabFields: TabField[] = [];

                            tabFields.push({
                                type: "text",
                                value: entry.startedDateTime,
                                label: "Request init time",
                            })

                            tabFields.push({ type: "text", label: "API", value: "FindPeople" });

                            const postData = getPostData(entry);

                            if (postData) {
                                const appName = postData.Body.Context.find((f: any) => f.Key == "AppName")?.Value;
                                const scenario = postData.Body.Context.find((f: any) => f.Key == "AppScenario")?.Value;
                            
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
                    },
                    {
                        name: "Suggestions",
                        getFields(entry) {
                            const fields: TabField[] = [];

                            if (!entry.response.content.text) {
                                return fields;
                            }
    
                            const response = JSON.parse(entry.response.content.text);

                            if (response && response.Body?.ResultSet) {

                                const stats: { [resultType: string]: number } = {};

                                fields.push({
                                    type: "text",
                                    value: response.Body.ResultSet.length,
                                    label: "Results count"
                                })

                                response.Body.ResultSet.forEach((suggestion: any) => {

                                    const mailboxType = suggestion.EmailAddress?.MailboxType ?? "<Unknown>";
                                    stats[mailboxType] = stats[mailboxType] != undefined ? stats[mailboxType] + 1 : 1;

                                    fields.push({
                                        type: "container",
                                        style: "accordeon",
                                        label: suggestion.DisplayName,
                                        fields: [
                                            {
                                                type: "json",
                                                value: suggestion,
                                            }
                                        ]
                                    });
                                });

                                if (Object.keys(stats).length) {
                                    fields.unshift({
                                        type: "table",
                                        headers: [
                                            { name: "Type", key: "resultType" },
                                            { name: "Count", key: "count" },
                                        ],
                                        values: Object.keys(stats).map(resultType => ({ resultType, count: stats[resultType] })),
                                        label: "Result type counts",
                                    });
                                }
                            }
                            else {
                                fields.push({ type: "label", label: "No people results" });
                            }


                            return fields;
                        },
                    },
                    {
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
                    }
                ]
            }
        }
}


const getPostData = (entry: Entry) => {

    if (entry.request.method != "POST") {
        return null;
    }

    let postBody: string | undefined;

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