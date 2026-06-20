export function readJsonFile<T>(file: File): Promise<T> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const content = String(reader.result);
                const json = JSON.parse(content) as T;
                resolve(json);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(reader.error);
        };

        reader.readAsText(file);
    });
}