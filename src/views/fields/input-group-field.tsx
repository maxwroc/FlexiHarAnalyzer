import { TabFieldInputGroup } from "../../types/config";

export const InputGroupField = ({ field }: { field: TabFieldInputGroup }) => {
    const staticPart = field.staticPart || "second";

    const inputEl = (
        <input
            type="text"
            readOnly
            class="input input-bordered input-sm join-item w-full cursor-default"
            value={staticPart === "first" ? field.value2 : field.value1}
        />
    );

    const staticEl = (
        <span class="join-item bg-base-200 border border-base-content/20 px-3 flex items-center text-sm whitespace-nowrap">
            {staticPart === "first" ? field.value1 : field.value2}
        </span>
    );

    return (
        <label class="form-control w-full">
            {field.label && (
                <div class="label">
                    <span class="label-text">{field.label}</span>
                </div>
            )}
            <div class="join w-full">
                {staticPart === "first" ? (<>{staticEl}{inputEl}</>) : (<>{inputEl}{staticEl}</>)}
            </div>
        </label>
    );
};
