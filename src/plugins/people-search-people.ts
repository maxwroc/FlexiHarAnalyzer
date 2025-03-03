import { Content, Entry } from "har-format";
import { CustomTab, IRequestParser, TabField } from "../config";

const urlPattern = /(v1\.0|\/users)\/[^/]+\/people/;

export default {
    "people-search-people": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.method != "OPTIONS" && !!entry.request.url.match(urlPattern)
        },
        getColumnValues(entry: Entry) {

            console.log("dsfasdfafasd", entry.request.method)

            if (entry.request.method == "GET") {
                const url = new URL(entry.request.url);
                return {
                    "Query": url.searchParams.get("$search")
                };
            }

            return {
                "Query": "<null>"
            };
        },
        getCustomTabs(entry: Entry) {
            const tabs: CustomTab[] = [];

            tabs.push(getSuggestionsTab(graphPeopleSuggestionParser));

            tabs.push(kustoTab);

            const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value as string;
            if (tokenHeader) {
                tabs.push(tokenTab);
            }

            return tabs;
        }
    }
}

const getSuggestionsTab = (parser: { (o: any): ISuggestion[] | null }): CustomTab => {
    return {
        name: "Suggestions",
        getFields(entry: Entry) {
            const fields: TabField[] = [];

            const response = getJsonContent(entry.response.content);
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


const graphPeopleSuggestionParser = (response: any): ISuggestion[] | null => {
    if (!response.value) {
        return null;
    }

    return response.value.map((v: any) => ({
        text: `${v.displayName} <${v.userPrincipalName}>`,
        content: v,
    }));
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

const tokenTab: CustomTab = {
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

const kustoTab: CustomTab = {
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

        const clientRequestId = entry.response.headers.find(h => h.name == "client-request-id")?.value as string;
        tabFields.push({ type: "text", label: "Client request ID", value: clientRequestId });

        if (requestTime && serverRequestId) {
            const kustoQuery = `let clientRequest = tolower("${clientRequestId}");
            let requestDate = datetime(${requestTime});
            let startTime = datetime_add("Minute", -5, requestDate);
            let endTime = datetime_add("Minute", 5, requestDate);
            cluster('o365monweu.westeurope.kusto.windows.net').database('o365monitoring').PeopleQueryLogEntryEvent_Global
            | where env_time between (startTime .. endTime)
            | where ClientRequestId == clientRequest 
            | project-reorder env_time, MailboxGuid, QueryScenario, IsPublicDataQuery, Top, Skip, PersonQueryLength, UserSpecifiedSourceNames, ReturnedResultCount, RemovedMaskedContactsCount
            | take 5`;

            
            tabFields.push({ type: "large-text", label: "Kusto query", value: kustoQuery.replace(/^\s+/gm, '') });
        }

        return tabFields;
    }
}


interface ISuggestion {
    text: string;
    content: any;
}