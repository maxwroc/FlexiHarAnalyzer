



export interface IJsonParseResult<T> {
    data: T | null;
    error: string | null;
}

export class FileReaderExt<T> {
    constructor(private file: File) {

    }

    public get name() { return this.file.name };

    public async getJson(): Promise<IJsonParseResult<T>> {

        const content = await this.getText();
        if (!content) {
            return { data: null, error: "File is empty" };
        }

        try {
            const jsonContent = JSON.parse(content);
            return { data: jsonContent as T, error: null };
        }
        catch(e) {
            console.warn("Failed to parse JSON", e);
            return { data: null, error: e instanceof Error ? e.message : String(e) };
        }
    }

    public async getRepairedJson(): Promise<T | null> {
        const content = await this.getText();
        if (!content) {
            return null;
        }

        try {
            return JSON.parse(repairJson(content)) as T;
        }
        catch (e) {
            console.warn("Failed to parse repaired JSON", e);
            return null;
        }
    }

    public getText(): Promise<string | null> {
        const result = new Promise<string | null>(resolve => {
            const reader = new FileReader();
            reader.addEventListener("load", event => {
                if (event.target?.result) {
                    resolve(<string>event.target.result);
                }
                else {
                    resolve(null);
                }
            });

            reader.readAsText(this.file);
        });

        return result;
    }

}

/**
 * Attempts to repair truncated JSON by closing all open structures.
 * Walks the string character-by-character tracking the nesting stack,
 * then appends the necessary closing tokens.
 */
function repairJson(text: string): string {
    const stack: string[] = []; // tracks expected closing chars: } ] "
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (ch === "\\") {
            if (inString) escape = true;
            continue;
        }

        if (inString) {
            if (ch === '"') {
                inString = false;
                stack.pop(); // remove the '"' we pushed
            }
            continue;
        }

        switch (ch) {
            case '"':
                inString = true;
                stack.push('"');
                break;
            case '{':
                stack.push('}');
                break;
            case '[':
                stack.push(']');
                break;
            case '}':
            case ']':
                if (stack.length > 0 && stack[stack.length - 1] === ch) {
                    stack.pop();
                }
                break;
        }
    }

    // If we ended inside a string, close it and remove the trailing
    // incomplete value (the key or value that was being written)
    let repaired = text;
    if (inString) {
        // Close the unterminated string
        repaired += '"';
        stack.pop(); // remove the '"'
    }

    // Remove trailing incomplete tokens (e.g. trailing comma, colon, partial key)
    repaired = repaired.replace(/,\s*$/, "");

    // Close all remaining open structures in reverse order
    while (stack.length > 0) {
        repaired += stack.pop();
    }

    return repaired;
}