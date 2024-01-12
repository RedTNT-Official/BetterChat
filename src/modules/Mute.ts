import { ServerPlayer } from "bdsx/bds/player";

const mute = new Map<string, NodeJS.Timeout>();

export class Mute {
    player: ServerPlayer;
    timeout: NodeJS.Timeout;

    constructor(player: ServerPlayer) {
        this.player = player;
    }

    get left(): number {
        const timer = mute.get(this.player.getXuid());
        if (!timer) return 0;
        // @ts-ignore
        return Math.ceil((timer._idleStart + cooldown.get(xuid)?._idleTimeout) / 1000 - process.uptime());
    }
}