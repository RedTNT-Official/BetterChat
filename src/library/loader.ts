import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

export const dataDir = join(process.cwd(), '..', 'BetterChat');
export const pluginDir = join(__dirname, '../..');

export class Configuration<T>{
    private path: string;
    defaultData?: T;
    data: T;

    constructor(filename: string, defaultData?: T) {
        this.path = join(dataDir, filename);
        this.defaultData = defaultData;
    }

    get version(): string {
        return JSON.parse(readFileSync(join(pluginDir, 'package.json'), 'utf-8')).version;
    }

    /**
     * @alias this.read
     */
    update() {
        return this.read();
    }

    read(): T {
        if (!existsSync(this.path)) this.write(this.defaultData ?? {});

        return this.data = JSON.parse(readFileSync(this.path, 'utf-8'));
    }

    write(data: any) {
        if (!existsSync(dataDir)) mkdirSync(dataDir);
        writeFileSync(this.path, JSON.stringify(data));
    }
}

export async function loadCommands() {
    console.log("=".repeat(30).magenta);
    console.log("Loading commands:".green);
    console.log("=".repeat(30).magenta);
    await loadFiles("commands");
}

export async function loadFiles(dirname: string) {
    const path = join(__dirname, '..', dirname);
    const files = readdirSync(path);

    for (const file of files) {
        if (statSync(join(path, file)).isDirectory()) {
            loadFiles(join(dirname, file));
            continue;
        }

        try {
            await import(`./${dirname}/${file}`);
            console.log("Loaded".yellow, file.magenta);
        } catch (e) {
            console.error(e);
        }
    }
}