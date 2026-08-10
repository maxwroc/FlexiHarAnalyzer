import { TabField } from "../../types/config";
import { AccordionContainerField } from "./accordion-container-field";
import { ImageField } from "./image-field";
import { InputGroupField } from "./input-group-field";
import { JsonField } from "./json-field";

const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);
const legacyKustoFieldLabels = new Set(["3S Request Logs", "SSA Logs"]);
const maxKustoDeepLinkQueryLength = 8000;

const getKustoDeepLink = (cluster: string, database: string, query: string) => {
    const clusterName = cluster
        .replace(/^https?:\/\//i, "")
        .replace(/\.kusto\.windows\.net\/?$/i, "")
        .replace(/\/$/, "");

    return `https://dataexplorer.azure.com/clusters/${encodeURIComponent(clusterName)}/databases/${encodeURIComponent(database)}?query=${encodeURIComponent(query)}`;
};

const getKustoConnection = (query: string) => {
    const match = query.match(/\bcluster\s*\(\s*"([^"]+)"\s*\)\s*\.\s*database\s*\(\s*"([^"]+)"\s*\)/i);
    return match ? { cluster: match[1], database: match[2] } : null;
};

const renderKustoQuery = (label: string | undefined, query: string, cluster: string, database: string, linkText?: string) => (
    <label class="form-control w-full">
        <div class="label gap-3">
            <span class="label-text">{label || "Kusto query"}</span>
            <a
                class="btn btn-primary btn-sm"
                href={getKustoDeepLink(cluster, database, query)}
                target="_blank"
                rel="noopener noreferrer">
                {linkText || "Open logs"}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
                    <path d="M5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
            </a>
        </div>
        <textarea readOnly class="textarea textarea-bordered h-24 w-full" value={query} />
    </label>
);

export const renderField = (field: TabField, index: number) => {
    switch (field.type) {
        case "header":
            return <div class={`${index == 0 ? "mb-2" : "mt-5 mb-2"} text-xs font-semibold uppercase tracking-wider opacity-50 border-b border-base-content/20 pb-1`}>{field.label}</div>
        case "label":
            return <div class="text-sm">{field.label}</div>
        case "container":
            switch (field.style) {
                case "accordion":
                case "accordeon": // deprecated, use "accordion"
                    return <AccordionContainerField field={field} fieldIndex={index} />
                default:
                    console.error("Container field style not supported");
            }
            break;
        case "text":
            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <input type="text" readOnly class="input input-bordered input-sm w-full cursor-default" value={field.value} />
                </label>
            )
        case "large-text": {
            const query = field.value == null ? "" : String(field.value);
            const kustoConnection = legacyKustoFieldLabels.has(field.label || "") && query.length <= maxKustoDeepLinkQueryLength
                ? getKustoConnection(query)
                : null;
            if (kustoConnection) {
                return renderKustoQuery(field.label, query, kustoConnection.cluster, kustoConnection.database);
            }

            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <textarea class="textarea textarea-bordered h-24 w-full">{field.value}</textarea>
                </label>
            )
        }
        case "kusto-query":
            return renderKustoQuery(field.label, field.query, field.cluster, field.database, field.linkText)
        case "json":
            return (<JsonField field={field} fieldIndex={index} />)
        case "table":
            return (<>
                {field.label && <h1 class="mb-3">{field.label}</h1>}
                <table className="table table-xs">
                    <thead>
                        <tr>
                            {field.headers.map(h => {
                                
                                return <th style={h.width ? "width: " + h.width + "px" : ""}>{h.name}</th>
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {field.values.map(value => (
                            <tr>
                                {field.headers.map(header => (
                                    <td class="truncate text-nowrap hover:text-wrap relative">
                                        {header.copyButton && (
                                            <div class="copy-button absolute right-1 top-0 z-[1]">
                                                <button class="btn btn-xs btn-square btn-neutral cursor-copy" aria-label="copy" onClick={() => copyToClipboard(value[header.key])}>
                                                    <svg class="fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                                        <path d="M 16 3 C 14.742188 3 13.847656 3.890625 13.40625 5 L 6 5 L 6 28 L 26 28 L 26 5 L 18.59375 5 C 18.152344 3.890625 17.257813 3 16 3 Z M 16 5 C 16.554688 5 17 5.445313 17 6 L 17 7 L 20 7 L 20 9 L 12 9 L 12 7 L 15 7 L 15 6 C 15 5.445313 15.445313 5 16 5 Z M 8 7 L 10 7 L 10 11 L 22 11 L 22 7 L 24 7 L 24 26 L 8 26 Z"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        {value[header.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </>);
        case "image":
            return <ImageField field={field} />
        case "input-group":
            return <InputGroupField field={field} />
        case "hint": {
            return (
                <div class="mt-2 flex items-start gap-2 text-xs opacity-70">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 w-4 h-4 mt-px" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        {field.label && <span class="font-medium">{field.label}: </span>}
                        {field.value}
                    </span>
                </div>
            )
        }
        case "link":
            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <a class="px-3" href={field.href}>{field.text || field.href}</a>
                </label>
            )
    }

    return <></>
}
