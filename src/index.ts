/**
 *  ____       _   _             _____ _           _   
 * |  _ \     | | | |           / ____| |         | |  
 * | |_) | ___| |_| |_ ___ _ __| |    | |__   __ _| |_ 
 * |  _ < / _ \ __| __/ _ \ '__| |    | '_ \ / _` | __|
 * | |_) |  __/ |_| ||  __/ |  | |____| | | | (_| | |_ 
 * |____/ \___|\__|\__\___|_|   \_____|_| |_|\__,_|\__|
 *  By: RedTNT
 */
import { registerPlaceholder, setPlaceholders } from "@bdsx/bdsx-placeholderapi";
import { PluginConfig, broadcast, getMentions, getTime } from "./library/utils";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { Configuration } from "./library/loader";
import { bedrockServer } from "bdsx/launcher";
import { ChatHistory } from "./modules/History";
import { TextPacket } from "bdsx/bds/packets";
import { AntiSpam } from "./modules/AntiSpam";
import { Cooldown } from "./modules/Cooldown";
import { ChatRoom } from "./modules/ChatRoom";
import { CANCEL } from "bdsx/common";
import { events } from "bdsx/event";
import { Color } from "colors";
import { Mute } from "./modules/Mute";

export const configuration = new Configuration<PluginConfig>('configuration.json');
const ipAddress = new Map<string, string>();

events.packetBefore(MinecraftPacketIds.Text).on((packet, netId) => {
    const player = netId.getActor()!;
    const config = configuration.data;

    const level = bedrockServer.level;

    // Shut up
    const mute = new Mute(player);
    if (mute.left > 0) {
        player.sendMessage(`§cYou are muted! You will be able to speak again in §6${mute.left} §cseconds.`);
        return CANCEL;
    }

    // Not that fast!
    const cooldown = new Cooldown(player, config.chat.cooldown);
    if (cooldown.left > 0) {
        player.sendMessage(`§cYou are sending chats too fast! Wait §6${cooldown.left} §cmore seconds to speak again.`);
        return CANCEL;
    }

    // Private secret sharing chat
    const room = ChatRoom.find(player);
    if (config.chat.maxLength > 0 && packet.message.length > config.chat.maxLength && room?.access != 'private') {
        player.sendMessage(`§cYour message is too long (§6${config.chat.maxLength} §ccaracter limit)`);
        return CANCEL;
    }

    // Can't you say something different?
    if (config.chat.antiSpam && room?.access !== "private") {
        const spam = new AntiSpam(player);
        spam.lastMessage = packet.message;
        const messages = spam.lastMessages;

        if (messages.length >= 3 && messages.every(m => m === packet.message)) {
            player.sendMessage('§cYou cannot send the same message §63 §ctimes!');
            return CANCEL;
        }
    }

    // Hey you, YOU! check the chat
    if (config.chat.mentionSound.trim() !== '') {
        const mentions = getMentions(packet.message);

        bedrockServer.level.getPlayers()
            .filter(p => mentions.includes(p.getName()))
            .forEach(p => p.playSound(config.chat.mentionSound));
    }

    // They've been talking 'bout you!!
    if (config.chat.maxHistory > 0) {
        const history = new ChatHistory(config.chat.maxHistory);
        history.addMessage(player, packet.message);
    }

    if (config.chat.cooldown > 0 && room?.access !== 'private') cooldown.run();

    if (room) {
        const chat = setPlaceholders(config.room.chat, player).replace('%message%', packet.message);
        level.getPlayerByXuid(room.owner.xuid)?.sendMessage(chat);
        room.members.forEach((member) => level.getPlayerByXuid(member.xuid)?.sendMessage(chat));
        return CANCEL;
    }

    if (config.logInConsole) console.log(`<${player.getName()}>`.green, packet.message.replace(/§[0-z]/g, '').yellow);
    if (config.chat.playerMessage.trim().length > 0) {
        broadcast(setPlaceholders(config.chat.playerMessage, player).replace('%message%', packet.message));
        return CANCEL;
    }
});

events.playerJoin.on(({ player }) => {
    const config = configuration.data;
    const pos = player.getPosition();
    const history = new ChatHistory(config.chat.maxHistory);

    // Messages history:
    if (config.chat.maxHistory > 0) history.lines.forEach((value) => player.sendChat(value.content, value.author));

    // Join message:
    bedrockServer.level.getPlayers().forEach(p => p.sendMessage(setPlaceholders(config.broadcast.playerJoin, player)));

    // Console join message:
    console.log(`[${getTime()}]`.grey, 'Player connected:'.green, player.getName().yellow, 'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow);

    // Welcome:
    const { welcome } = config.broadcast;
    if (welcome.chat.trim().length > 0) player.sendMessage(setPlaceholders(welcome.chat, player));
    if (welcome.subtitle.trim().length > 0) player.sendSubtitle(setPlaceholders(welcome.subtitle, player));
    if (welcome.title.trim().length > 0) player.sendMessage(setPlaceholders(welcome.title, player));
    if (welcome.sound.trim().length > 0) player.playSound(welcome.sound);
});

// Player join log
events.packetAfter(MinecraftPacketIds.Login).on((packet, netId) => {
    const address: string = netId.getAddress().split('|')[0];
    const connreq = packet.connreq;
    if (!connreq) return;

    const certificate = connreq.getCertificate();
    const xuid: string = certificate.getXuid();
    const name = certificate.getId();

    ipAddress.set(xuid, address);

    // Console connecting message:
    console.log(
        `[${getTime()}]`.grey,
        'Player connecting:'.green, name.yellow,
        'Ip:'.green, address.yellow,
        'Xuid:'.green, xuid.yellow
    );
});

// Sleep message:
events.playerSleepInBed.on(async ({ player }) => {
    setTimeout(() => {
        if (!player.isSleeping()) return;

        const { playerSleep } = configuration.data.broadcast;
        if (playerSleep.chat.trim().length > 0) broadcast(setPlaceholders(playerSleep.chat, player));

        // Sleep actionbar message:
        if (playerSleep.actionbar.trim().length === 0) return;
        const interval: NodeJS.Timeout = setInterval(() => {
            const sleepCount = bedrockServer.level.getPlayers().filter(p => p.isSleeping()).length;
            if (sleepCount === 0) return clearInterval(interval);

            bedrockServer.level.getPlayers().forEach(p => p.sendActionbar(setPlaceholders(playerSleep.actionbar, player)));
        }, 500);
    }, 100);
});

// Player left message:
events.playerLeft.on((event) => {
    const player = event.player;
    const xuid: string = player.getXuid();
    const address: string = ipAddress.get(xuid)!;
    const pos = player.getPosition();

    const { playerLeft } = configuration.data.broadcast;
    // Left room:
    const room = ChatRoom.find(player);
    room?.leave(player);

    // Left message:
    broadcast(setPlaceholders(playerLeft, event.player));
    // Console left message:
    console.log(
        `[${getTime()}]`.grey,
        'Player disconnected:'.green, player.getName()?.yellow,
        'Ip:'.green, address?.yellow,
        'Xuid:'.green, player.getXuid()?.yellow,
        'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow
    );
});

events.packetSend(MinecraftPacketIds.Text).on((packet) => {
    if (packet.type !== TextPacket.Types.Translate) return;
    if (packet.type === 2 && /join|left|sleeping/.exec(packet.message)) return CANCEL;
});

events.serverOpen.on(() => {
    const { version } = configuration.data;
    console.log(`BetterChat BDSX v${version}`.cyan, '- by: RedTNT');

    import("./commands/bchat/bchat");
});

events.serverLog.on((log: string, color: Color) => {
    log = log.replace('NO LOG FILE! - ', '').replace(/\[([^]+)\]/, `[${getTime()}]`.grey);
    if (/[a-z]/.exec(log[0])) log = log[0].toUpperCase() + log.slice(1);

    if (!/Player (connected|disconnected)|Running AutoCompaction/.exec(log))
        console.log(color(log));

    return CANCEL;
});

// Player name placeholder:
registerPlaceholder('player_name', (player): string => {
    return player?.getName()!;
});
// Sleeping count:
registerPlaceholder('sleep_count', (): string => {
    const players = bedrockServer.level.getPlayers();
    return players.filter(p => p.isSleeping()).length.toString();
});