import { ChatRoom, askPassword, confirmLeave } from "../../modules/ChatRoom";
import { FormButton, SimpleForm } from "bdsx/bds/form";
import { CommandOriginType } from "bdsx/bds/commandorigin";
import { setPlaceholders } from "@bdsx/bdsx-placeholderapi";
import { configuration } from "../..";
import { ServerPlayer } from "bdsx/bds/player";
import { command } from "bdsx/command";
import cmd from "./room";

cmd.overload((_, origin, out) => {
    if (origin.getOriginType() !== CommandOriginType.Player) return out.error('This command can only be executed by players.');

    const player = origin.getEntity() as ServerPlayer;
    const rooms = ChatRoom.getAll();

    const form = new SimpleForm('Chat Rooms');
    form.setContent('Choose a chat room to join:');
    rooms.forEach(r => form.addButton(new FormButton(r.name)));

    form.sendTo(player.getNetworkIdentifier(), async ({ response }) => {
        if (!response) return;

        const room = rooms[response];
        if (!room.isValid()) return player.sendMessage('§cRoom no longer exists.');

        if (room.access === "private") {
            const password = await askPassword(player);
            if (room.password !== password) return player.sendMessage('§cWrong password.');
        }

        const oldRoom = ChatRoom.find(player);
        const isOwner = room.owner.xuid === player.getXuid();
        const confirmation = oldRoom ? await confirmLeave(player, oldRoom, isOwner) : true;

        if (!confirmation) return;

        const { playerJoin } = configuration.data.room;
        oldRoom?.leave(player);
        room.join(player);
        out.success(`You joined to the ${room.name} room!`);
        room.broadcast(setPlaceholders(playerJoin, player));
    });
}, {
    join: command.enum('option.join', 'join')
});