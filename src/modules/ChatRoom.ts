import { CustomForm, FormInput, ModalForm } from "bdsx/bds/form";
import { ServerPlayer } from "bdsx/bds/player";
import { bedrockServer } from "bdsx/launcher";

const rooms = new Map<string, ChatRoom>();

export class ChatRoom {
    owner: RoomMember;
    name: string;
    access: RoomAccess;
    password?: string;
    members: RoomMember[] = [];

    constructor(owner: ServerPlayer, name: string, access: RoomAccess = "public", password?: string) {
        this.owner = parseMember(owner);
        this.name = name;
        this.access = access;
        this.password = password;
        rooms.set(this.owner.xuid, this);
    }

    static find(player: ServerPlayer): ChatRoom | undefined {
        const xuid = player.getXuid();
        const list = Array.from(rooms.values());
        return list.find(r => r.owner.xuid === xuid || r.members.some(m => m.xuid === xuid));
    }

    static getAll(): ChatRoom[] {
        return [...rooms.values()];
    }

    broadcast(message: string) {
        const level = bedrockServer.level;
        const owner = level.getPlayerByXuid(this.owner.xuid);
        owner?.sendMessage(message);
        
        this.members.forEach(({ xuid }) => {
            const player = level.getPlayerByXuid(xuid);
            player?.sendMessage(message);
        });
    }

    setOwner(player: ServerPlayer) {
        rooms.delete(this.owner.xuid);
        this.owner = parseMember(player);
        this.members = this.members.filter(m => m.xuid !== this.owner.xuid);
        rooms.set(this.owner.xuid, this);
    }

    join(player: ServerPlayer) {
        this.members.push(parseMember(player));
    }

    leave(player: ServerPlayer) {
        const xuid = player.getXuid();
        if (xuid === this.owner.xuid && this.members.length === 0) return this.dissolve();

        this.members = this.members.filter(m => m.xuid !== xuid);
    }

    dissolve() {
        rooms.delete(this.owner.xuid);
    }

    isValid(): boolean {
        return rooms.has(this.owner.xuid);
    }
}

export function askPassword(player: ServerPlayer, creating: boolean = false): Promise<string> {
    return new Promise((resolve) => {
        const netID = player.getNetworkIdentifier();
    
        const form = new CustomForm('Create Form');
        form.addComponent(new FormInput(`Enter the${creating ? ' new ' : ' '}room password`));
        form.sendTo(netID, async ({ response }) => {
            if (!response) return;
            
            if (/[A-z]|[0-9]/g.exec(response[0].trim())) return resolve(response[0].trim());
            resolve(await askPassword(player, creating));
        });
    });
}

export function confirmLeave(player: ServerPlayer, room: ChatRoom, isOwner: boolean): Promise<boolean> {
    return new Promise((resolve) => {
        const form = new ModalForm('Leave confirmation');
        form.setContent(`Are you sure you want to leave the ${room.name} room?${isOwner && room.members.length === 0 ? '\n§cThis will dissolve the chat room.' : ''}`);
        form.sendTo(player.getNetworkIdentifier(), ({ response }) => {
            resolve(response);
        });
    });
}

function parseMember(player: ServerPlayer): RoomMember {
    return {
        name: player.getName(),
        xuid: player.getXuid()
    }
}

export type RoomAccess = "public" | "private";
export type RoomMember = {
    name: string;
    xuid: string;
}