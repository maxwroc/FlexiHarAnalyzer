/* Register your parser by adding it to request_parsers.
 * The key ("my-parser") must be unique across all loaded parsers. */
request_parsers["google-auto-complete"] = (context) => {
    return {
        /* 
         * When true, matching requests (when isRequestSupported returns true) will be visually highlighted in the list 
         */
        highlightRequest: true,

        /* 
         * Define extra columns to show in the request list table.
         * Example: [{ id: "custom_column", name: "My Column", defaultWidth: 100 }] 
         */
        getColumnsInfo: [{ id: "query", name: "Query", defaultWidth: 200 }],

        /* 
         * Determines whether this parser handles the given HAR entry.
         * Return true to activate this parser for the entry. 
         */
        isRequestSupported(entry) {
            return entry.request.url.includes("/complete/search");
        },

        /* 
         * Returns values for the custom columns defined in getColumnsInfo.
         * Example: return { custom_column: "Value for my column" };
         */
        getColumnValues(entry) {
            const url = new URL(entry.request.url);
            return { query: url.searchParams.get("q") };
        },

        /* 
         * Returns custom tabs shown in the request detail view.
         * Each tab has a name and a getFields function returning an array of fields.
         * Available field types: header, text, large-text, json, table,
         *   container, label, link, input-group, image, hint 
         */
        getCustomTabs(entry) {
            const tabs = [];
        
            tabs.push({
                name: "Suggestions",
                getFields(entry) {
                    const fields = [];
                    const raw = entry.response.content.text;
    
                    const jsonStart = raw.indexOf("[");
                    const json = jsonStart !== -1 ? raw.substring(jsonStart) : raw;
    
                    try {
                        const [suggestions, meta] = JSON.parse(json);
    
                        if (meta?.i) {
                            fields.push({
                                type: "input-group",
                                label: "Query",
                                value1: meta.i,
                                value2: meta.q || "",
                                staticPart: "first",
                            });
                        }
    
                        const tableValues = suggestions.map(([htmlText, relevance, flags]) => ({
                            text: htmlText.replace(/<\/?b>/g, ""),
                            relevance: relevance.toString(),
                            flags: JSON.stringify(flags),
                        }));
    
                        fields.push({
                            type: "table",
                            label: "Suggestions",
                            headers: [
                                { name: "Text", key: "text", copyButton: true },
                                { name: "Relevance", key: "relevance", width: 80 },
                                { name: "Flags", key: "flags", width: 120 },
                            ],
                            values: tableValues,
                        });
    
                        fields.push({
                            type: "container",
                            style: "accordion",
                            label: "Raw parsed JSON",
                            fields: [{
                                type: "json",
                                value: { suggestions, meta },
                                options: { autoExpand: 2, searchEnabled: true },
                            }],
                        });
    
                    } catch (e) {
                        fields.push({
                            type: "hint",
                            label: "Parse error",
                            value: String(e),
                            style: "error",
                        });
                    }
    
                    return fields;
                },
            });
        
            return tabs;
        }
    };
};
