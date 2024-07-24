import { Entry } from "har-format"


export const defaultConfig: IConfig = {
    hiddenColumns: [
        "Type"
    ],
    requestParsers: {
        "generic": {
            getColumnsInfo: [
                { name: "Name" },
                { name: "Path" },
                { name: "Status", defaultWidth: 40 },
                { name: "Type", defaultWidth: 130 },
                { name: "Method", defaultWidth: 70 },
            ],
            isRequestSupported() {
                return true;
            },
            getColumnValues(entry) {

                const uri = new URL(entry.request.url);

                let name = "";
                let pathChunks = uri.pathname.split("/");
                if (pathChunks.length == 0) {
                    name = uri.hostname;
                }
                else {
                    name = pathChunks[pathChunks.length - 1];
                }

                name += uri.search;

                return {
                    "Name": name,
                    "Path": uri.pathname,
                    "Status": entry.response.status.toString(),
                    "Type": entry.response.content.mimeType.split(";").shift() as string,
                    //"Url": entry.request.url,
                    "Method": entry.request.method,
                }
            },
            getCustomTabs() {
                return;
            }
        },
        "people-search": {
            getColumnsInfo: [
                { name: "Query", defaultWidth: 150 }
            ],
            isRequestSupported(entry) {
                return entry.request.url.includes("/suggestions");
            },
            getColumnValues(entry) {
                if (entry.request.postData && entry.request.postData.text) {
                    const requestPostData = JSON.parse(entry.request.postData.text);

                    console.log("People request", (<Array<any>>requestPostData.EntityRequests).find(er => er.EntityType == "People"))

                    const queryString = (<Array<any>>requestPostData.EntityRequests).find(er => er.EntityType == "People").Query.QueryString;

                    return {
                        "Query": queryString
                    };
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
                            console.log(entry.request.headers)
                            const tokenHeader = entry.request.headers.find(h => h.name.toLowerCase() == "authorization")?.value as string;
                            if (tokenHeader) {
                                // getting base64 encoded chunks
                                let token = tokenHeader.split(" ").pop();
                                if (token) {
                                    // we should have 3 chunks
                                    const tokenChunks = token.split(".");
                                    if (tokenChunks.length != 3) {
                                        console.log("not a proper token");
                                        return [];
                                    }

                                    try {
                                        const decodedToken = atob(tokenChunks[1]);

                                        let pos = decodedToken.indexOf("\"upn\":\"");
                                        if (pos) {
                                            pos += 7;
                                            const upn = decodedToken.substring(pos, decodedToken.indexOf("\"", pos));
                                            
                                            console.log("upn", upn)
                                            if (upn) {
                                                return [
                                                    { type: "text", value: upn }
                                                ]
                                            }
                                        }
                                    }
                                    catch(e) {
                                        console.log("Failed to decode token")
                                    }
                                    
                                }
                            }

                            return [];
                        },
                    }
                ]
            }
        },
        "people-search-findpeople": {
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

                            const tabFields: ICustomTabField[] = [];

                            tabFields.push({ type: "text", label: "API", value: "FindPeople" });

                            const encodedPostData = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;

                            if (encodedPostData) {
                                const postData = JSON.parse(decodeURIComponent(encodedPostData));

                                tabFields.push({ type: "text", label: "Query", value: postData.Body.QueryString ?? "<null>" });
                                tabFields.push({ type: "text", label: "SearchPeopleSuggestionIndex", value: postData.Body.SearchPeopleSuggestionIndex ?? "<null>" });
                                tabFields.push({ type: "text", label: "QuerySources", value: postData.Body.QuerySources?.join(",") ?? "<null>" });
                            }

                            return tabFields;
                        },
                    },
                    {
                        name: "Post data",
                        getFields(entry) {

                            const encodedPostData = entry.request.headers.find(h => h.name.toLowerCase() == "x-owa-urlpostdata")?.value;

                            if(encodedPostData) {
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
}


export interface IConfig {
    hiddenColumns?: string[] | undefined;
    requestParsers: { [id: string]: IRequestPerser };
}

export interface IRequestPerser {
    getColumnsInfo: IRequestColumnInfo[];
    isRequestSupported(entry: Entry): boolean;
    getColumnValues(entry: Entry): { [columnName: string]: string }; 
    getCustomTabs(entry: Entry): ICustomTab[] | void;
}

export interface IRequestColumnInfo {
    name: string;
    defaultWidth?: number;
    showBefore?: string;
}

export interface ICustomTab {
    name: string;
    getFields: { (entry: Entry): ICustomTabField[] } ;
}

export interface ICustomTabField {
    type: "text" | "large-text" | "html" | "json";
    label?: string;
    value: any
}