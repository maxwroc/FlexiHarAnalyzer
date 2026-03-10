export const newParserTemplate = `/* Register your parser by adding it to request_parsers.
 * The key ("my-parser") must be unique across all loaded parsers. */
request_parsers["my-parser"] = (context) => {
    return {
        /* 
         * When true, matching requests (when isRequestSupported returns true) will be visually highlighted in the list 
         */
        highlightRequest: false,

        /* 
         * Define extra columns to show in the request list table.
         * Example: [{ id: "custom_column", name: "My Column", defaultWidth: 100 }] 
         */
        getColumnsInfo: [],

        /* 
         * Determines whether this parser handles the given HAR entry.
         * Return true to activate this parser for the entry. 
         */
        isRequestSupported(entry) {
            return false;
        },

        /* 
         * Returns values for the custom columns defined in getColumnsInfo.
         * Example: return { custom_column: "Value for my column" };
         */
        getColumnValues(entry) {
            return {};
        },

        /* 
         * Returns custom tabs shown in the request detail view.
         * Each tab has a name and a getFields function returning an array of fields.
         * Available field types: header, text, large-text, json, table,
         *   container, label, link, input-group, image, hint 
         */
        getCustomTabs(entry) {
            return [
                {
                    name: "Custom Tab",
                    getFields(entry) {
                        return [
                            { type: "header", label: "My Parser" },
                            { type: "text", label: "URL", value: entry.request.url },
                        ];
                    }
                }
            ];
        }
    };
};
`;
