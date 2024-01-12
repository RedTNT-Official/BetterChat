import { bedrockServer } from "bdsx/launcher";

export function broadcast(message: string) {
    bedrockServer.level.getPlayers().forEach(p => p.sendMessage(message));
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

/**
 * Get the local time in hour:minute:second format
 * @returns Local time in string
 */
export function getTime(): string {
    const date = new Date();
    return fill(date.getHours()) + ':' + fill(date.getMinutes()) + ':' + fill(date.getSeconds());
}

function fill(number: number): string {
    return "0".repeat(2 - number.toString().length) + number;
}

export interface PluginConfig {
    version: number;
    logInConsole: boolean;

    chat: {
        playerMessage: string;
        cooldown: number;
        maxLength: number;
        maxHistory: number;
        antiSpam: boolean;
        mentionSound: string;
    }

    broadcast: {
        playerJoin: string;
        playerLeft: string;
        playerSleep: {
            chat: string;
            actionbar: string;
        }
        welcome: {
            chat: string;
            title: string;
            subtitle: string;
            sound: string;
        }
    }

    room: {
        playerJoin: string;
        playerLeft: string;
        chat: string;
        welcome: {
            message: string;
            sound: string;
        }
    }

    extras: {
        MOTD: {
            custom: boolean;
            interval: number;
            values: string[];
        }
    }
}