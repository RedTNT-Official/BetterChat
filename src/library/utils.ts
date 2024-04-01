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
    version: string;
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

export const defaultConfig: PluginConfig = {
    version: '1.10.0',
    logInConsole: true,

    chat: {
        playerMessage: '<%player_name%> %message%',
        cooldown: 0,
        maxLength: 0,
        maxHistory: 30,
        antiSpam: false,
        mentionSound: 'random.orb'
    },
    
    broadcast: {
        playerJoin: "§7[§a+§7] §8%player_name%",
        playerLeft: "§7[§c-§7] §8%player_name%",
        playerSleep: {
            chat: '§b%player_name% is sleeping...',
            actionbar: '§aThere are §6%sleep_count% §asleeping players'
        },
        welcome: {
            chat: '§aWelcome to server %player_name%!',
            title: '',
            subtitle: '',
            sound: 'random.levelup'
        }
    },

    room: {
        playerJoin: '§7[§e+ §dRoom§7]§r %player_name%',
        playerLeft: '§7[§4- §dRoom§7]§r %player_name%',
        chat: '§8[§dRoom§8] §7<§r%player_name%§7>§r %message%',
        welcome: {
            message: `Welcome to this room!`,
            sound: 'random.levelup'
        },
    },

    extras: {
        MOTD: {
            custom: true,
            interval: 5,
            values: [
                'BetterChat BDSX',
                'My server',
                'Made by RedTNT'
            ]
        }
    }
}