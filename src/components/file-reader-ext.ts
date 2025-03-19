



export class FileReaderExt<T> {
    constructor(private file: File) {

    }

    public get name() { return this.file.name };

    public async getJson(): Promise<T | null> {

        const content = await this.getText();
        if (!content) {
            return null;
        }

        try {
            const jsonContent = JSON.parse(content);
            return <T>jsonContent;
        }
        catch(e) {
            console.warn("Failed to parse JSON", e);
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