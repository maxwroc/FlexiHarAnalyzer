import { CustomTab, IRequestParser, TabField } from "../config";

export default {
    "people-search-people": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.url.includes("/me/people")
                || entry.request.url.includes(")/people")
                || entry.request.url.includes("ClientPeoplePickerWebServiceInterface")
                || entry.request.url.includes("sharepoint.com/_api/search/query")
                || entry.request.url.includes("/client.svc/ProcessQuery")
                || entry.request.url.includes("/ShareObject")
                || entry.request.url.includes("StateServiceHandler.ashx?docId=call_")
                || (entry.request.method == "POST" && entry.request.url.includes("/createLink"));
        },
        getColumnValues() {
            return {};
        },
        getCustomTabs() {
            return [
                notImplementedTab,
                tokenTab,
            ]
        }
    }
}

const notImplementedTab: CustomTab = {
    name: "Not implemented",
    getFields(entry) {
        const fields: TabField[] = [];

        if (entry.request.url.includes("/people")) {
            fields.push({
                type: "text",
                label: "Not implemented API",
                value: "Graph /me/people"
            });
        }
        else if (entry.request.url.includes("ClientPeoplePickerWebServiceInterface")) {
            fields.push({
                type: "text",
                label: "Not implemented API",
                value: "Sharepoint people picker"
            });
            fields.push({
                type: "text",
                label: "Doc",
                value: "https://eng.ms/docs/experiences-devices/onedrivesharepoint/sharepoint-online-and-onedrive-for-business/sharepoint-collab-sharing/compteamwikitsgs/sharing/generalguides/peoplepickeroverview"
            });
        }
        else if (entry.request.url.includes("sharepoint.com/_api/search/query")
            || entry.request.url.includes("/client.svc/ProcessQuery")
            || entry.request.url.includes("/ShareObject")) {
            fields.push({
                type: "text",
                label: "Not implemented API",
                value: "Sharepoint"
            });

            const requestDate = entry.response.headers.find(h => h.name.toLowerCase() == "date")?.value as string;
            const requestId = entry.response.headers.find(h => h.name.toLowerCase() == "request-id")?.value as string;
            
            fields.push({
                type: "text",
                label: "Response date",
                value: requestDate
            }); 
            
            fields.push({
                type: "text",
                label: "Request Id",
                value: requestId
            });

            if (requestDate && requestId) {
                const genevaUrl = "https://portal.microsoftgeneva.com/logs/dgrep?be=DGrep&ep=FirstParty%20PROD&ns=nsSPOProd&en=RawULS&time=" 
                    + new Date(Date.parse(requestDate)).toISOString()
                    + "&UTC=true&offset=%2B10&offsetUnit=Minutes&scopingConditions=[[%22CorrelationId%22,%22"
                    + requestId
                    + "%22]]&serverQuery=&chartEditorVisible=true&chartType=line&chartLayers=[[%22DisableSwitchEngaged%22,%22%22]]%20";
                
                fields.push({
                    type: "link",
                    label: "SPO Logs",
                    href: genevaUrl,
                    text: "Microsoft geneva"
                })
            }
        }
        else if (entry.request.url.includes("StateServiceHandler.ashx?docId=call_")) {
            const correlationId = entry.response.headers.find(h => h.name.toLowerCase() == "x-correlationid")?.value as string;
            
            fields.push({
                type: "text",
                label: "Correlation Id",
                value: correlationId
            });

            // wss://jpc.pptservicescast.officeapps.live.com/StateServiceHandler.ashx?docId=call_4391546f-35ca-42af-b6ad-111179859581&clientType=Teams&cid=8cbc2797-eb3e-41bb-935e-4dbbd5f652f5&routing=true&clientId=3bd6b45d-b0f8-432d-8b8e-87e63fd3f330

            const searchString = "docId=call_";
            const pos = entry.request.url.indexOf(searchString);
            if (pos != -1) {
                const callId = entry.request.url.substring(pos + searchString.length, pos + searchString.length + 36);

                fields.push({
                    type: "text",
                    value: callId,
                    label: "Call ID",
                });
            }
            
            fields.push({
                type: "text",
                value: "Juri Guljajev",
                label: "Getting 3S Request ID - POC",
            });
        }

        return fields;
    },
};


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