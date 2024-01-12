import { ServerPlayer } from "bdsx/bds/player";

const cooldown = new Map<string, NodeJS.Timeout>();

export class Cooldown {
    player: ServerPlayer;
    timeout: NodeJS.Timeout;
    time: number;

    constructor(player: ServerPlayer, time: number) {
        this.player = player;
        this.time = time;
    }

    run() {
        const xuid = this.player.getXuid();
        cooldown.set(xuid, setTimeout(() => cooldown.delete(xuid), 1000 * this.time));
    }

    get left(): number {
        const timer = cooldown.get(this.player.getXuid());
        if (!timer) return 0;
        // @ts-ignore
        return Math.ceil((timer._idleStart + cooldown.get(xuid)?._idleTimeout) / 1000 - process.uptime());
    }
}