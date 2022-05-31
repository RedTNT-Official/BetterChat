/**
 *  ____       _   _             _____ _           _   
 * |  _ \     | | | |           / ____| |         | |  
 * | |_) | ___| |_| |_ ___ _ __| |    | |__   __ _| |_ 
 * |  _ < / _ \ __| __/ _ \ '__| |    | '_ \ / _` | __|
 * | |_) |  __/ |_| ||  __/ |  | |____| | | | (_| | |_ 
 * |____/ \___|\__|\__\___|_|   \_____|_| |_|\__,_|\__|
 * By: RedTNT
 */
import { Configuration, createRoom, disolveRoom, findRoomByXuid, getMentions, getTime, joinRoom, parse, rooms, Room, RoomMember, sendActionbar, sendMC, sleepCount, version, leaveRoom } from "./lib/utils";
import { PlayerJoinEvent, PlayerLeftEvent, PlayerSleepInBedEvent } from "bdsx/event_impl/entityevent";
import { registerPlaceholder, setPlaceholders } from "@bdsx/bdsx-placeholderapi";
import { Certificate, ConnectionRequest } from "bdsx/bds/connreq";
import { LoginPacket, TextPacket } from "bdsx/bds/packets";
import { SimpleForm, FormButton } from "bdsx/bds/form";
import { Player, ServerPlayer } from "bdsx/bds/player";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { serverProperties } from "bdsx/serverproperties";
import { ServerInstance } from "bdsx/bds/server";
import { bedrockServer } from "bdsx/launcher";
import { command } from "bdsx/command";
import { CANCEL } from "bdsx/common";
import { events } from "bdsx/event";
import { Level } from "bdsx/bds/level";
import { Color } from "colors";
import { CxxString } from "bdsx/nativetype";

const history: { author: string; content: string }[] = [];
const cooldown = new Map<string, NodeJS.Timeout>();
const mute = new Map<string, NodeJS.Timeout>();
const addresses = new Map<string, string>();
const spam = new Map<string, string[]>();
export let config: Configuration = parse();
export let serverInstance: ServerInstance;
export let level: Level;

events.serverOpen.on(() => {
    serverInstance = bedrockServer.serverInstance;
    level = bedrockServer.level;
    console.log('BetterChat BDSX'.cyan, '- by: RedTNT');

    // bchat command:
    const cmd = command.register('bchat', 'BetterChat command');

    // bchat config reload:
    cmd.overload((_param, origin, output) => {
        if (!origin.isServerCommandOrigin()) return output.error('This command can only be executed by console');

        config = parse();
        output.success('Configuration has been updated'.green);
    }, {
        config: command.enum('option.config', 'config'),
        reload: command.enum('option.reload', 'reload')
    });

    // bchat version
    cmd.overload((_param, _origin, output) => {
        output.success(version);
    }, {
        'version ': command.enum('version', 'version')
    });

    // Alias of bchat version
    cmd.overload((_param, _origin, output) => {
        output.success(version);
    }, {
        'version ': command.enum('v', 'v')
    });

    // bchat room create
    cmd.overload((param, origin, _output) => {
        if (origin.isServerCommandOrigin()) return console.log('This command can only be executed by players'.red);
        const player: ServerPlayer = <ServerPlayer>origin.getEntity();
        const xuid: string = player.getXuid();
        createRoom(xuid, param.access, (room: Room, code: string) => {
            if (room == null) return player.sendMessage('§cYou already are in a room');
            player.sendMessage('§aThe room has been created');
            if (code) player.sendMessage('Access code: ' + code);
        });

    }, {
        room: command.enum('option.action', 'room'),
        create: command.enum('option.create', 'create'),
        access: [command.enum('AccessType', 'private', 'public'), true]
    });

    // bchat room disolve
    cmd.overload(async (_param, origin, _output) => {
        if (origin.isServerCommandOrigin()) return console.log('This command can only be executed by players'.red);
        const player: ServerPlayer = <ServerPlayer>origin.getEntity();
        const xuid: string = player.getXuid();

        disolveRoom(xuid);
    }, {
        room: command.enum('option.action', 'room'),
        disolve: command.enum('option.disolve', 'disolve')
    });

    // bchat room join
    cmd.overload((param, origin, _output) => {
        if (origin.isServerCommandOrigin()) return console.log('This command can only be executed by players'.red);
        const player: ServerPlayer = <ServerPlayer>origin.getEntity();
        const netId: NetworkIdentifier = player.getNetworkIdentifier();
        const xuid: string = player.getXuid();

        if (param.code) {
            joinRoom({ xuid: xuid, code: param.code }, (room: Room | null | undefined, owner: ServerPlayer | null, err: boolean) => {
                if (!room) return player.sendMessage('§cRoom not found');
                if (err) return player.sendMessage('§cYou already are in that room');
                player.sendMessage('§aYou joined the room');
                owner?.sendMessage(setPlaceholders(config.playerJoinRoom, player));
                room.members.forEach((value: RoomMember) => {
                    const member: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(value.xuid);
                    member.sendMessage(setPlaceholders(config.playerJoinRoom, player));
                });
            });
            return;
        }
        const form: SimpleForm = new SimpleForm();
        form.setTitle('Public Rooms');
        form.setContent('Choose a chat room to join in:');
        rooms.forEach((value: Room) => {
            if (value.access == 'public') form.addButton(new FormButton(value.owner.username + '\'s room'))
        });
        if (rooms.filter((value: Room) => value.access == 'public').length == 0) form.setContent('There are no rooms to join in');

        form.sendTo(netId, async (data) => {
            if (data.response == null) return;
            const room: Room | undefined = rooms.find((value: Room) => value.owner.username == form.getButton(data.response)?.text.split('\'')[0]);

            joinRoom({ xuid: xuid, ownerXuid: room?.owner.xuid }, (room: Room | null | undefined, owner: ServerPlayer | null, err: boolean) => {
                if (!room) return player.sendMessage('§cRoom not found');
                if (err) return player.sendMessage('§cYou already are in that room');
                player.sendMessage('§aYou joined the room');
                owner?.sendMessage(setPlaceholders(config.playerJoinRoom, player));
                room.members.forEach((value: RoomMember) => {
                    const member: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(value.xuid);
                    member.sendMessage(setPlaceholders(config.playerJoinRoom, player));
                });
            });
        });
    }, {
        room: command.enum('option.action', 'room'),
        join: command.enum('option.join', 'join'),
        code: [CxxString, true]
    });

    cmd.overload((param, origin, output) => {
        if (origin.isServerCommandOrigin()) return console.log('This command can only be executed by players'.red);
        const player: ServerPlayer = <ServerPlayer>origin.getEntity();
        const xuid: string = player.getXuid();

        leaveRoom(xuid, (room: Room | null) => {
            if (room == null) return player.sendMessage('§cYou\'re not in a room');
            player.sendMessage('§eYou\'re not in this room anymore');
        });
    }, {
        room: command.enum('option.action', 'room'),
        leave: command.enum('option.leave', 'leave')
    });

    let i: number = 0;
    const interval = setInterval(() => {
        if (bedrockServer.isClosed()) return clearInterval(interval);

        if (config.motd.useDefault) return serverInstance.setMotd(serverProperties["server-name"]!);
        if (config.motd.interval == 0) i = 0;
        serverInstance.setMotd(config.motd.values[i]);

        if (i == (config.motd.values.length - 1)) return i = 0;
        i++;
    }, 1000 * config.motd.interval);
});

events.packetBefore(MinecraftPacketIds.Text).on((packet: TextPacket, netId: NetworkIdentifier) => {
    const player: ServerPlayer = <ServerPlayer>netId.getActor();
    const xuid: string = player.getXuid();
    const room: Room | undefined = findRoomByXuid(xuid)?.room;

    // AntiSpam stuff:
    if (mute.has(xuid)) {
        // @ts-ignore
        const left: number = Math.ceil((mute.get(xuid)?._idleStart + mute.get(xuid)?._idleTimeout) / 1000 - process.uptime());
        player.sendMessage(`§cYou are muted. Wait §6${left} §cmore seconds to speak again`);
        return CANCEL;
    };

    // Cooldown:
    if (cooldown.has(xuid) && room?.access != 'private') {
        // @ts-ignore
        const left: number = Math.ceil((cooldown.get(xuid)?._idleStart + cooldown.get(xuid)?._idleTimeout) / 1000 - process.uptime());
        player.sendMessage(`§cYou are sending chats too faster!. Wait §6${left} §cmore seconds to speak again`);
        return CANCEL;
    };

    // Max-Length:
    if (config.maxMessageLength !== 0 && packet.message.length > config.maxMessageLength && room?.access != 'private') {
        player.sendMessage(`§cYour message is too long (§6${config.maxMessageLength} §ccaracter limit)`);
        return CANCEL;
    };

    // Anti-Spam:
    if (config.antiSpam.enabled && config.antiSpam.limit > 0 && room?.access != 'private') {
        let messages: string[] = spam.get(xuid)!;
        messages.push(packet.message);

        if (messages.length >= config.antiSpam.limit) {

            if (messages.every((value: string) => value == packet.message) && messages.length >= config.antiSpam.limit) {
                if (!config.antiSpam.mute) player.sendMessage(`§cYou can't send the same message §6${config.antiSpam.limit} §ctimes`);
                else {
                    player.sendMessage(`§cYou has been muted for spamming. You will be able to talk in §6${config.antiSpam.seconds} §cseconds`);
                    mute.set(xuid, setTimeout(() => mute.delete(xuid), 1000 * config.antiSpam.seconds));
                    sendMC(`§6${player.getName()} §ehas been muted for spamming`);
                    messages = [];
                }
                messages.shift();
                spam.set(xuid, messages);
                return CANCEL;
            }
            messages.shift();
        }
        spam.set(xuid, messages);
    };

    // Sound on @mention:
    if (config.soundOnMention.enabled) {
        level.getPlayers().forEach((value: ServerPlayer) => {
            if (getMentions(packet.message).includes(value.getName()) && (room == findRoomByXuid(value.getXuid())?.room || !room))
                value.playSound(config.soundOnMention.sound);
        });
    };

    // Message history:
    if (config.messageHistory.enabled && config.messageHistory.limit <= 0 && !room) {
        if (history.length >= config.messageHistory.limit) history.shift();
        history.push({
            author: player.getName(),
            content: packet.message
        });
    };

    // Log chats in console:
    if (config.logInConsole === true && !room) console.log(`<${player.getName()}>`.green, packet.message.replace(/§[0-z]/g, '').yellow);

    // Cooldown between messages:
    if (config.cooldown != 0 && room?.access == 'public') cooldown.set(xuid, setTimeout(() => cooldown.delete(xuid), 1000 * config.cooldown));

    // Room message:
    if (room) {
        const chat: string = setPlaceholders(config.roomMessage, player).replace('%message%', packet.message);
        const owner: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(room.owner.xuid);
        owner.sendMessage(chat);
        room.members.forEach((value: RoomMember) => {
            const member: ServerPlayer = <ServerPlayer>level.getPlayerByXuid(value.xuid);

            member.sendMessage(chat);
        });
        return CANCEL;
    }
});

// Player name placeholder:
registerPlaceholder('player_name', (player: ServerPlayer): string => {
    return player.getName();
});
// Sleeping count:
registerPlaceholder('sleep_count', (_player: ServerPlayer): string => {
    return sleepCount().toString();
});

// Cancel vanilla join / left / sleep messages:
events.packetSend(MinecraftPacketIds.Text).on((packet: TextPacket, netId: NetworkIdentifier) => {
    if (packet.type !== TextPacket.Types.Translate) return;

    if (/join|left|bed/.exec(packet.message)) return CANCEL;
});

events.playerJoin.on((event: PlayerJoinEvent) => {
    const player: ServerPlayer = event.player;
    const address: string = player.getNetworkIdentifier().getAddress().split('|')[0];
    const xuid: string = player.getXuid();
    const pos = player.getPosition();

    // Save address:
    addresses.set(xuid, address);

    // Anti-Spam stuff:
    spam.set(player.getXuid(), []);

    // Join message:
    sendMC(setPlaceholders(config.playerJoin, player));
    // Console join message:
    console.log(`[${getTime()}]`.grey, 'Player connected:'.green, player.getName().yellow, 'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow);

    // Welcome:
    player.sendMessage(setPlaceholders(config.welcome.message, player));
    player.playSound(config.welcome.sound);
});

events.packetAfter(MinecraftPacketIds.Login).on((packet: LoginPacket, netId: NetworkIdentifier) => {
    const address: string = netId.getAddress().split('|')[0];
    const connreq: ConnectionRequest | null = packet.connreq;
    if (connreq == null) return;

    const cert: Certificate = connreq.getCertificate();
    const xuid: string = cert.getXuid();
    const name = cert.getId();

    // Console connecting message:
    console.log(
        `[${getTime()}]`.grey,
        'Player connecting:'.green, name.yellow,
        'Ip:'.green, address.yellow,
        'Xuid:'.green, xuid.yellow
    );
});

events.playerLeft.on((event: PlayerLeftEvent) => {
    const player: ServerPlayer = event.player;
    const xuid: string = player.getXuid();
    const address: string = addresses.get(xuid)!
    const pos = player.getPosition();

    // Left room:
    leaveRoom(xuid, () => { });

    // Left message:
    sendMC(setPlaceholders(config.playerLeft, event.player));
    // Console left message:
    console.log(
        `[${getTime()}]`.grey,
        'Player disconnected:'.green, player.getName().yellow,
        'Ip:'.green, address.yellow,
        'Xuid:'.green, player.getXuid().yellow,
        'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow
    );
});

// Sleep message:
events.playerSleepInBed.on(async (event: PlayerSleepInBedEvent) => {
    const player: Player = event.player;
    setTimeout(() => {
        if (!player.isSleeping()) return;
        sendMC(setPlaceholders(config.playerSleep.chat, player));

        // Sleep actionbar message:
        const interval: NodeJS.Timeout = setInterval(() => {
            if (sleepCount() == 0) return clearInterval(interval);
            if (config.playerSleep.actionbar.trim().length != 0)
                sendActionbar(setPlaceholders(config.playerSleep.actionbar, player));
        }, 500);
    }, 100);
});

events.serverLog.on((log: string, color: Color) => {
    log = log.replace(/\[([^]+)\]/, `[${getTime()}]`.grey).replace('NO LOG FILE! - ', '');
    if (/[a-z]/.exec(log[0])) log = log[0].toUpperCase() + log.slice(1);

    if (!/Player (connected|disconnected)|Running AutoCompaction/.exec(log))
        console.log(color(log));

    return CANCEL;
});