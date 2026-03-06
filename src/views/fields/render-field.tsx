import { TabField } from "../../types/config";
import { AccordionContainerField } from "./accordion-container-field";
import { JsonField } from "./json-field";

const copyToClipboard = (val: string) => navigator.clipboard.writeText(val);

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
        case "large-text":
            return (
                <label class="form-control w-full">
                    {field.label && <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>}
                    <textarea class="textarea textarea-bordered h-24 w-full">{field.value}</textarea>
                </label>
            )
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
