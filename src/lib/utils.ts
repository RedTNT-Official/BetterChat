/**
 *  ____       _   _             _____ _           _   
 * |  _ \     | | | |           / ____| |         | |  
 * | |_) | ___| |_| |_ ___ _ __| |    | |__   __ _| |_ 
 * |  _ < / _ \ __| __/ _ \ '__| |    | '_ \ / _` | __|
 * | |_) |  __/ |_| ||  __/ |  | |____| | | | (_| | |_ 
 * |____/ \___|\__|\__\___|_|   \_____|_| |_|\__,_|\__|
 * By: RedTNT
 */ 
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { bedrockServer } from "bdsx/launcher";
import { ServerPlayer } from "bdsx/bds/player";
import { join } from "path";

const configPath: string = join(process.cwd(), '..', 'config');
const path: string = join(configPath, 'DiscordConnection');
const file: string = join(path, 'configuration.json');

export const version: string = 'BetterChat v1.0.3';

const defaultConfig: Configuration = {
    logInConsole: true,
    cooldown: 0,
    maxMessageLength: 0,
    messageHistory: {
        enabled: true,
        limit: 20
    },
    antiSpam: {
        enabled: true,
        mute: true,
        seconds: 10,
        limit: 3
    },
    playerJoin: '§7[§a+§7] §8%player_name%',
    playerLeft: '§7[§c-§7] §8%player_name%',
    playerSleep: {
        chat: '§b%player_name% is sleeping...',
        actionbar: ''
    },
    welcome: {
        message: '§aWelcome to server %player_name%!',
        sound: 'random.levelup'
    },
    soundOnMention: {
        enabled: true,
        sound: 'random.orb'
    }
}

export function parse(): Configuration {
    if (!existsSync(path)) dump(defaultConfig);
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
        console.log('[BetterChat] There\'s an error with the config file. Will use default configuration.'.bgRed);
        return defaultConfig;
    }
}

export function dump(content: Configuration, indent: number = 4): void {
    if (!existsSync(configPath)) mkdirSync(configPath);
    if (!existsSync(path)) mkdirSync(path);
    writeFileSync(file, JSON.stringify(content, null, indent));
}

/**
 * Send a message to all players
 * @param message Message content
 * @param author Sender (Optional)
 * @returns The amount of players that recieved the message
 */
export function sendMC(message: string, author?: string): number {
    const players = bedrockServer.level.getPlayers();
    players.forEach((v: ServerPlayer) => {
        if (author) return v.sendChat(message, author);
        v.sendMessage(message);
    });
    return players.length;
}

/**
 * Send an actionbar for all players
 * @param message Actionbar content
 * @returns The amount of players that recieved the actionbar
 */
export function sendActionbar(message: string): number {
    const players = bedrockServer.level.getPlayers();
    players.forEach((v: ServerPlayer) => {
        v.sendTip(message);
    });
    return players.length;
}

/**
 * @returns The amount of sleeping players
 */
export function sleepCount(): number {
    return bedrockServer.level.getPlayers().filter((value: ServerPlayer) => value.isSleeping()).length;
}

export function getMentions(text: string): string[] {
    const regex: RegExp = /@"([^"]*)|@([^]*)/g;
    const resultado: string[] = [];
    let grupo: RegExpExecArray | null;

    while ((grupo = regex.exec(text)) !== null) {
        resultado.push(grupo[1] || grupo[2]);
    }
    return resultado;
}

export function getTime(): string {
    const date: Date = new Date();
    return fill(date.getHours()) + ':' + fill(date.getMinutes()) + ':' + fill(date.getSeconds());
}

function fill(number: number) {
    return "0".repeat(2 - number.toString().length) + number.toString();
}

export interface Configuration {
    logInConsole: boolean;
    cooldown: number;
    maxMessageLength: number;
    messageHistory: {
        enabled: boolean;
        limit: number;
    };
    antiSpam: {
        enabled: boolean;
        mute: true;
        seconds: number;
        limit: number
    };
    playerJoin: string;
    playerLeft: string;
    playerSleep: {
        chat: string;
        actionbar: string;
    };
    welcome: {
        message: string;
        sound: string;
    };
    soundOnMention: {
        enabled: boolean;
        sound: string;
    };
}