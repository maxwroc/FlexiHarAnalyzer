export interface IParserError {
    parserId: string;
    fnName: string;
    message: string;
    stack: string;
}

type Listener = (errors: IParserError[]) => void;

class ParserErrorStore {
    private errors: IParserError[] = [];
    private listeners: Listener[] = [];

    add(parserId: string, fnName: string, error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const stack = trimStack(err.stack);

        this.errors.push({ parserId, fnName, message: err.message, stack });
        this.notify();
    }

    getErrors(): IParserError[] {
        return this.errors;
    }

    clear() {
        this.errors = [];
        this.notify();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.errors));
    }
}

function trimStack(stack: string | undefined): string {
    if (!stack) return "";
    const lines = stack.split("\n");
    const relevant = lines.filter(line =>
        line.includes("<anonymous>") || line.includes("Function") || !line.trimStart().startsWith("at ")
    );
    return relevant.join("\n");
}

export const parserErrorStore = new ParserErrorStore();
