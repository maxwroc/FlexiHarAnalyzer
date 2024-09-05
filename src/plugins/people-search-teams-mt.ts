import { IRequestParser, TabField } from "../config";

export default {
    "people-search-teams-mt": <IRequestParser>{
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
        getCustomTabs() {
            return [
                {
                    name: "Teams MT",
                    getFields(entry) {

                        const tabFields: TabField[] = [];

                        const serverRequest = entry.response.headers.find(h => h.name == "x-serverrequestid")?.value as string;

                        tabFields.push({ type: "text", label: "X-ServerRequestId", value: serverRequest });

                        if (serverRequest) {
                            
                            const dashedGuid  =[8,4,4,4,12].reduce((acc,v,i) => {
                                let pos = acc.length - (i > 1 ? i - 1 : 0);
                                let dash = i != 0 ? "-" : "";
                                acc += dash + serverRequest.substring(pos, pos + v);
                                return acc;
                            }, "")

                            tabFields.push({ type: "text", label: "3S Request ID", value: dashedGuid.toLowerCase() });
                        }

                        const requestTime = entry.response.headers.find(h => h.name == "date")?.value as string;
                        if (requestTime) {
                            tabFields.push({ type: "text", label: "Request Time", value: requestTime });
                        }

                        return tabFields;
                    },
                },
                {
                    name: "Suggestions",
                    getFields(entry) {
                        const fields: TabField[] = [];

                        const response = JSON.parse(entry.response.content.text!);

                        if (response) {
                            response.value.forEach((suggestion: any) => {
                                fields.push({
                                    type: "container",
                                    style: "accordeon",
                                    label: suggestion.displayName,
                                    fields: [
                                        {
                                            type: "table",
                                            headers: [
                                                { name: "Name", key: "name", width: 220 },
                                                { name: "Value", key: "value", copyButton: true },
                                            ],
                                            values: Object.keys(suggestion).map(k => ({
                                                name: k,
                                                value: Array.isArray(suggestion[k]) ? suggestion[k].join(", ") : suggestion[k],
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
                },
                {
                    name: "Token",
                    getFields(entry) {
                        const fields: TabField[] = [];

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
            ]
        }
    }
}