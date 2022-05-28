/**
 *  ____       _   _             _____ _           _   
 * |  _ \     | | | |           / ____| |         | |  
 * | |_) | ___| |_| |_ ___ _ __| |    | |__   __ _| |_ 
 * |  _ < / _ \ __| __/ _ \ '__| |    | '_ \ / _` | __|
 * | |_) |  __/ |_| ||  __/ |  | |____| | | | (_| | |_ 
 * |____/ \___|\__|\__\___|_|   \_____|_| |_|\__,_|\__|
 * By: RedTNT
 */
import { Configuration, getMentions, getTime, parse, sendActionbar, sendMC, sleepCount, version } from "./lib/utils";
import { PlayerJoinEvent, PlayerLeftEvent, PlayerSleepInBedEvent } from "bdsx/event_impl/entityevent";
import { registerPlaceholder, setPlaceholders } from "@bdsx/bdsx-placeholderapi";
import { Certificate, ConnectionRequest } from "bdsx/bds/connreq";
import { LoginPacket, TextPacket } from "bdsx/bds/packets";
import { CommandPermissionLevel } from "bdsx/bds/command";
import { Player, ServerPlayer } from "bdsx/bds/player";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { bedrockServer } from "bdsx/launcher";
import { command } from "bdsx/command";
import { events } from "bdsx/event";
import { CANCEL } from "bdsx/common";
import { Level } from "bdsx/bds/level";
import { Color } from "colors";

const addresses = new Map<string, string>();
const cooldown = new Map<string, NodeJS.Timeout>();
const history: { author: string; content: string }[] = [];
const spam = new Map<string, string[]>();
const mute = new Map<string, NodeJS.Timeout>();
let config: Configuration = parse();
let level: Level;

events.serverOpen.on(() => {
    console.log('BetterChat BDSX'.cyan, '- by: RedTNT');
    level = bedrockServer.level;
    const cmd = command.register('betterchat', '', CommandPermissionLevel.Host);

    cmd.overload((_param, _origin, output) => {
        config = parse();
        output.success('Se actualizó la configuración'.green);
    }, {
        config: command.enum('option.config', 'config'),
        reload: command.enum('option.reload', 'reload')
    });

    cmd.overload((_param, _origin, output) => {
        output.success(version);
    }, {
        'version ': command.softEnum('version', 'version', 'v')
    });
});

events.packetBefore(MinecraftPacketIds.Text).on((packet: TextPacket, netId: NetworkIdentifier) => {
    const player: ServerPlayer = <ServerPlayer>netId.getActor();
    const xuid: string = player.getXuid();

    //AntiSpam stuff:
    if (mute.has(xuid)) {
        //@ts-ignore
        const left: number = Math.ceil((mute.get(xuid)?._idleStart + mute.get(xuid)?._idleTimeout) / 1000 - process.uptime());
        player.sendMessage(`§cEstás silenciado/a. Espera §6${left} §csegundos más antes de enviar otro mensaje`);
        return CANCEL;
    };

    //Cooldown:
    if (cooldown.has(xuid)) {
        //@ts-ignore
        const left: number = Math.ceil((cooldown.get(xuid)?._idleStart + cooldown.get(xuid)?._idleTimeout) / 1000 - process.uptime());
        player.sendMessage(`§cTienes que esperar §6${left} §csegundos más antes de enviar otro mensaje`);
        return CANCEL;
    };

    //Max-Length:
    if (config.maxMessageLength !== 0 && packet.message.length > config.maxMessageLength) {
        player.sendMessage(`§cTu mensaje es demasiado largo! (Límite de §6${config.maxMessageLength} §ccarácteres)`);
        return CANCEL;
    };

    //Anti-Spam:
    if (config.antiSpam.enabled && config.antiSpam.limit > 0) {
        let messages: string[] = spam.get(xuid)!;
        messages.push(packet.message);

        if (messages.length >= config.antiSpam.limit) {

            if (messages[0] == messages[1] && messages[1] == messages[2]) {
                if (!config.antiSpam.mute) player.sendMessage(`§cNo puedes enviar el mismo mensaje §6${config.antiSpam.limit} §cveces`);
                else {
                    player.sendMessage(`§cHas sido silenciado/a por spam. Podrás hablar denuevo dentro de §6${config.antiSpam.seconds} §csegundos`);
                    mute.set(xuid, setTimeout(() => mute.delete(xuid), 1000 * config.antiSpam.seconds));
                    sendMC(`§6${player.getName()} §eha sido silenciado por spam`);
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

    //Message history:
    if (config.messageHistory.enabled) {
        if (config.messageHistory.limit <= 0) return;
        if (history.length >= config.messageHistory.limit) history.shift();
        history.push({
            author: player.getName(),
            content: packet.message
        });
    };

    //Sound on @mention:
    if (config.soundOnMention.enabled) {
        level.getPlayers().forEach((v: ServerPlayer) => {
            if (getMentions(packet.message).includes(v.getName())) v.playSound(config.soundOnMention.sound);
        });
    };

    //Log chats in console:
    if (config.logInConsole === true) console.log(`<${player.getName()}>`.green, packet.message.replace(/§[0-z]/g, '').yellow);

    //Cooldown between messages:
    if (config.cooldown !== 0) cooldown.set(xuid, setTimeout(() => cooldown.delete(xuid), 1000 * config.cooldown));
});

// Join / left messages:
registerPlaceholder('player_name', (player: ServerPlayer): string => {
    return player.getName();
});

//Cancel vanilla join / left messages:
events.packetSend(MinecraftPacketIds.Text).on((packet: TextPacket, netId: NetworkIdentifier) => {
    if (packet.type !== TextPacket.Types.Translate) return;

    if (/join|left|bed/.exec(packet.message)) return CANCEL;
});

events.playerJoin.on((event: PlayerJoinEvent) => {
    const player: ServerPlayer = event.player;
    const address: string = player.getNetworkIdentifier().getAddress().split('|')[0];
    const xuid: string = player.getXuid();
    const pos = player.getPosition();

    //Save address:
    addresses.set(xuid, address);

    //Anti-Spam stuff:
    spam.set(player.getXuid(), []);

    //Join message:
    sendMC(setPlaceholders(config.playerJoin, player));

    console.log(`[${getTime()}]`.grey, 'Player connected:'.green, player.getName().yellow, 'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow);

    //Welcome:
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

    console.log(`[${getTime()}]`.grey, 'Player connecting:'.green, name.yellow, 'Ip:'.green, address.yellow, 'Xuid:'.green, xuid.yellow);
});

events.playerLeft.on((event: PlayerLeftEvent) => {
    const player: ServerPlayer = event.player;
    const xuid: string = player.getXuid();
    const address: string = addresses.get(xuid)!
    const pos = player.getPosition();

    //Left message:
    sendMC(setPlaceholders(config.playerJoin, event.player));

    console.log(`[${getTime()}]`.grey, 'Player disconnected:'.green, player.getName().yellow, 'Ip:'.green, address.yellow, 'Xuid:'.green, player.getXuid().yellow, 'Coords:'.green, `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`.yellow);
});

//Sleep message:
events.playerSleepInBed.on(async (event: PlayerSleepInBedEvent) => {
    const player: Player = event.player;
    setTimeout(() => {
        if (!player.isSleeping()) return;
        sendMC(setPlaceholders(config.playerSleep.chat, player));
        
        const interval: NodeJS.Timeout = setInterval(() => {
            if (sleepCount() == 0) return clearInterval(interval);
            sendActionbar(setPlaceholders(config.playerSleep.actionbar, player));
        }, 500);
    }, 100);
});

events.serverLog.on((log: string, color: Color) => {
    log = log.replace(/\[([^]+)\]/, `[${getTime()}]`.grey).replace('NO LOG FILE! - s', 'S');
    
    if (!/Player (connected|disconnected)|Running AutoCompaction/.exec(log))
    console.log(color(log));

    return CANCEL;
});