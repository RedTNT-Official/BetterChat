import { ServerPlayer } from "bdsx/bds/player";

const Messages = new Map<string, string[]>();

export class AntiSpam {
    player: ServerPlayer;

    constructor(player: ServerPlayer) {
        this.player = player;
    }

    get lastMessages(): string[] {
        return Messages.get(this.player.getXuid()) || [];
    }

    set lastMessage(message: string) {
        const messages = this.lastMessages;
        if (messages.length >= 3) messages.shift();
        messages.push(message);
        Messages.set(this.player.getXuid(), messages);
    }
}