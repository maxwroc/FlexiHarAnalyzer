import { Content } from "har-format";
import { IRequestParser, TabField } from "../config";

export default {
    "people-search-workingwith": <IRequestParser>{
        getColumnsInfo: [],
        isRequestSupported(entry) {
            return entry.request.url.includes("/workingwith");
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

                        const request = entry.request.postData && entry.request.postData.text ? JSON.parse(entry.request.postData.text) : null;
                        if (!request) {
                            return fields;
                        }

                        const tokenHeader = request.authorization
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