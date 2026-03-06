import { CustomTab, TabField, requestParsers } from "../types/config";

const imageMimeTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/x-icon", "image/avif"];

requestParsers["image"] = () => {
    return {
        highlightRequest: false,
        getColumnsInfo: [],
        isRequestSupported(entry) {
            const mimeType = entry.response.content.mimeType?.split(";")[0]?.trim();
            return imageMimeTypes.includes(mimeType) && !!entry.response.content.text;
        },
        getColumnValues() {
            return {};
        },
        getCustomTabs() {
            const tabs: CustomTab[] = [];

            tabs.push({
                name: "Image preview",
                getFields(entry) {
                    const fields: TabField[] = [];
                    const content = entry.response.content;
                    const mimeType = content.mimeType?.split(";")[0]?.trim();

                    let src: string;
                    if (content.encoding === "base64") {
                        src = `data:${mimeType};base64,${content.text}`;
                    } else {
                        // Text-based image (e.g. SVG) or unencoded
                        src = `data:${mimeType};base64,${btoa(content.text!)}`;
                    }

                    fields.push({
                        type: "image",
                        src,
                        mimeType,
                        size: content.size,
                    });

                    return fields;
                },
            });

            return tabs;
        }
    }
}
