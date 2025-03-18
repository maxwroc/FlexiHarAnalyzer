



export class FileManager<T> {
    constructor(private file: File) {

    }

    public get name() { return this.file.name };

    public async getJson(): Promise<T | null> {

        const result = new Promise<T | null>(resolve => {
            const reader = new FileReader();
            reader.addEventListener("load", event => {
                if (event.target?.result) {
                    console.log("File read: " + this.file.name);

                    try {
                        const jsonContent = JSON.parse(event.target.result as string);
                        resolve(<T>jsonContent);
                    }
                    catch(e) {
                        console.warn("Failed to parse JSON", e);
                        resolve(null);
                    }
                }
            });
            reader.readAsText(this.file);
        })

        return result;
    }
}