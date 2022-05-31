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
import { setPlaceholders } from "@bdsx/bdsx-placeholderapi"
import { bedrockServer } from "bdsx/launcher";
import { ServerPlayer } from "bdsx/bds/player";
import { generate } from "generate-password";
import { join } from "path";
import { level, config } from "..";

const configPath: string = join(process.cwd(), '..', 'config');
const path: string = join(configPath, 'BetterChat');
const file: string = join(path, 'configuration.json');

export const version: string = 'BetterChat v1.0.3';
export const rooms: Room[] = [];

const defaultConfig: Configuration = {
    logInConsole: true,
    cooldown: 0,
    maxMessageLength: 0,
    messageHistory: {
        enabled: true,
        limit: 20
    },
    antiSpam: {
        enabled: false,
        mute: false,
        seconds: 10,
        limit: 3
    },
    playerJoin: '§7[§a+§7] §8%player_name%',
    playerLeft: '§7[§c-§7] §8%player_name%',
    playerSleep: {
        chat: '§b%player_name% is sleeping...',
        actionbar: '§aThere are §6%sleep_count% §asleeping players'
    },
    roomMessage: '§8[§dRoom§8] §7<§r%player_name%§7>§r %message%',
    playerJoinRoom: '§7[§e+ §dRoom§7]§r %player_name%',
    playerLeaveRoom: '§7[§4- §dRoom§7]§r %player_name%',
    welcome: {
        message: '§aWelcome to server %player_name%!',
        sound: 'random.levelup'
    },
    soundOnMention: {
        enabled: true,
        sound: 'random.orb'
    },
    motd: {
        useDefault: true,
        interval: 5,
        values: [
            'BetterChat BDSX',
            'My server',
            'Made by RedTNT'
        ]
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

export function findRoomByXuid(xuid: string): { room: Room; index: number } | null {
    const room: Room | undefined = rooms.find((value: Room) => value.owner.xuid == xuid || value.members.find((value: RoomMember) => value.xuid == xuid));
    if (!room) return null;
    const index: number = rooms.findIndex((value: Room) => value.owner.xuid == xuid || value.members.find((value: RoomMember) => value.xuid == xuid));
    return {
        room: room,
        index: index
    }
}

/**
 * @param code Room's access code
 * @returns Room and index
 */
function findRoomByCode(code: string): { room: Room; index: number } | null {
    const room: Room | undefined = rooms.find((value: Room) => value.code?.toLowerCase() == code.toLowerCase());
    if (!room) return null;
    const index: number = rooms.findIndex((value: Room) => value.code == code);
    return {
        room: room,
        index: index
    }
}

export function createRoom(xuid: string, access: 'private' | 'public' = 'public', callback: (room: Room | null, code?: string) => void) {
    if (findRoomByXuid(xuid) != null) return callback(null);
    const player: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(xuid)!;
    let code: string | undefined;
    if (access == 'public') {
        rooms.push({
            access: 'public',
            owner: {
                username: player.getName(),
                xuid: xuid
            },
            members: []
        });
    }
    else {
        code = generate({
            length: 6,
            lowercase: false,
            uppercase: true,
            numbers: true,
            symbols: false
        });
        rooms.push({
            access: 'private',
            code: code,
            owner: {
                username: player.getName(),
                xuid: xuid
            },
            members: []
        });
    }
    callback(findRoomByXuid(xuid)?.room!, code);
}

export function joinRoom(options: { xuid: string; ownerXuid?: string; code?: string }, callback: (room: Room | undefined, owner: ServerPlayer | null, err: boolean) => void) {
    const player: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(options.xuid)!;
    const room = findRoomByXuid(options.ownerXuid!) || findRoomByCode(options.code!);
    if (room == null) return callback(undefined, null, false);
    const owner: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(room?.room.owner.xuid!);
    if (room?.room.owner.xuid == options.xuid || room?.room.members.find((value: RoomMember) => value.xuid == options.xuid))
        return callback(room.room, owner, true);

    if (findRoomByXuid(options.xuid) != null) leaveRoom(options.xuid, () => { });
    rooms[room?.index!].members.push({
        username: player.getName(),
        xuid: options.xuid
    });
    callback(room?.room, owner, false);
}

export function leaveRoom(xuid: string, callback: (room: Room | null) => void) {
    const player: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(xuid);
    const room = findRoomByXuid(xuid);
    if (room == null) return callback(null);

    if (room?.room.owner.xuid == xuid) {
        if (room.room.members.length == 0) return disolveRoom(xuid);
        const member: RoomMember = room.room.members[0];
        rooms[room.index].owner = member;
        rooms[room.index].members.splice(0, 1);
        return (<ServerPlayer>level.getPlayerByXuid(member.xuid)).sendMessage('§eYou are the new owner of this room');
    }
    room?.room.members.forEach((value: RoomMember, index: number) => {
        const member: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(value.xuid);
        member.sendMessage(setPlaceholders(config.playerLeaveRoom, player));
        if (value.xuid != xuid) return;
        rooms[room.index].members.splice(index, 1);
    });
    callback(room?.room);
}

export function disolveRoom(xuid: string) {
    const player: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(xuid);
    const room = findRoomByXuid(xuid);
    if (room == null) return player?.sendMessage('§cYou\'re not in a room');
    if (room.room.owner.xuid != xuid) return player?.sendMessage('§cYou need to be the owner to disolve the room');
    rooms.splice(room?.index!, 1);
    player?.sendMessage('§eRoom disolved');
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
    const date: Date = new Date();
    return fill(date.getHours()) + ':' + fill(date.getMinutes()) + ':' + fill(date.getSeconds());
}

function fill(number: number) {
    return "0".repeat(2 - number.toString().length) + number.toString();
}

export interface Room {
    access: 'private' | 'public';
    code?: string;
    owner: RoomMember;
    members: RoomMember[];
}

export interface RoomMember {
    username: string;
    xuid: string;
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
        mute: boolean;
        seconds: number;
        limit: number
    };
    playerJoin: string;
    playerLeft: string;
    playerSleep: {
        chat: string;
        actionbar: string;
    };
    roomMessage: string;
    playerJoinRoom: string;
    playerLeaveRoom: string;
    welcome: {
        message: string;
        sound: string;
    };
    soundOnMention: {
        enabled: boolean;
        sound: string;
    };
    motd: {
        values: string[];
        interval: number;
        useDefault: boolean;
    };
}