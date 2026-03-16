request_parsers["reddit-search-typeahead"] = (context) => {
    return {
        highlightRequest: true,

        getColumnsInfo: [{ id: "query", name: "Query", defaultWidth: 200 }],

        isRequestSupported(entry) {
            return entry.request.url.includes("/search-typeahead");
        },

        getColumnValues(entry) {
            const url = new URL(entry.request.url);
            return { query: url.searchParams.get("query") };
        },

        getCustomTabs(entry) {
            const tabs = [];

            tabs.push({
                name: "Suggestions",
                getFields(entry) {
                    const fields = [];
                    const html = entry.response.content.text;

                    if (!html) {
                        fields.push({ type: "hint", label: "No data", value: "Response body is empty", style: "warning" });
                        return fields;
                    }

                    const url = new URL(entry.request.url);
                    const query = url.searchParams.get("query") || "";

                    fields.push({
                        type: "input-group",
                        label: "Query",
                        value1: query,
                        value2: url.searchParams.get("cId") || "",
                        staticPart: "first",
                    });

                    // Parse query suggestions from tracking context JSON
                    const querySuggestions = [];
                    const communities = [];

                    const trackerRegex = /<search-telemetry-tracker\s+data-faceplate-tracking-context="([^"]+)"/g;
                    const seen = new Set();
                    let match;

                    while ((match = trackerRegex.exec(html)) !== null) {
                        try {
                            const ctx = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
                            const info = ctx.action_info;

                            if (info?.type === "query_suggestion") {
                                const displayQuery = ctx.meta_search?.display_query || "";
                                const key = "q:" + displayQuery;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    querySuggestions.push({
                                        text: displayQuery,
                                        position: String(info.position),
                                    });
                                }
                            } else if (info?.type === "subreddit") {
                                const sub = ctx.subreddit || {};
                                const key = "s:" + sub.name;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    communities.push({
                                        name: "r/" + sub.name,
                                        id: sub.id || "",
                                        position: String(info.position),
                                    });
                                }
                            }
                        } catch (_e) {
                            // skip malformed JSON
                        }
                    }

                    if (querySuggestions.length) {
                        fields.push({
                            type: "table",
                            label: "Query suggestions",
                            headers: [
                                { name: "Suggestion", key: "text", copyButton: true },
                                { name: "#", key: "position", width: 40 },
                            ],
                            values: querySuggestions,
                        });
                    }

                    if (communities.length) {
                        fields.push({
                            type: "table",
                            label: "Communities",
                            headers: [
                                { name: "Subreddit", key: "name", copyButton: true },
                                { name: "ID", key: "id", width: 100 },
                                { name: "#", key: "position", width: 40 },
                            ],
                            values: communities,
                        });
                    }

                    fields.push({
                        type: "container",
                        style: "accordion",
                        label: "Raw HTML response",
                        fields: [{
                            type: "large-text",
                            value: html,
                        }],
                    });

                    return fields;
                },
            });

            return tabs;
        },
    };
};
