/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module 'virtual:examples' {
    interface ExampleParser {
        name: string;
        path: string;
    }
    interface Example {
        name: string;
        harFile: string;
        parsers: ExampleParser[];
    }
    const examples: Example[];
    export default examples;
}
