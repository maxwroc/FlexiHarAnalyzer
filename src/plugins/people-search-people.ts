import { IRequestParser, TabField } from "../config";

export default {
    "people-search-people": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.url.includes("/people")
                || entry.request.url.includes("ClientPeoplePickerWebServiceInterface");
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

                        return fields;
                    },
                }
            ]
        }
    }
}