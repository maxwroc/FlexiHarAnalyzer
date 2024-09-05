import { IRequestParser, TabField } from "../config";

export default {
    "people-search-init": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.url.includes("/search/api/v1/init");
        },
        getColumnValues() {
            return {};
        },
        getCustomTabs() {
            return [
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
                                    catch (e: any) {
                                        fields.push({
                                            type: "large-text",
                                            label: "Failed to decode token",
                                            value: e.stack,
                                        }) 
                                        console.log("Failed to decode token",e);
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