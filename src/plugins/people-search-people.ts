import { IRequestParser, TabField } from "../config";

export default {
    "people-search-people": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.url.includes("/me/people")
                || entry.request.url.includes(")/people")
                || entry.request.url.includes("ClientPeoplePickerWebServiceInterface")
                || entry.request.url.includes("sharepoint.com/_api/search/query")
                || entry.request.url.includes("/client.svc/ProcessQuery")
                || entry.request.url.includes("/ShareObject");
        },
        getColumnValues() {
            return {};
        },
        getCustomTabs() {
            return [
                {
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

                        return fields;
                    },
                }
            ]
        }
    }
}