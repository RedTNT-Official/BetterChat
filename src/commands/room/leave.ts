import { CommandOriginType } from "bdsx/bds/commandorigin";
import { setPlaceholders } from "@bdsx/bdsx-placeholderapi";
import { configuration } from "../..";
import { ServerPlayer } from "bdsx/bds/player";
import { ChatRoom } from "../../modules/ChatRoom";
import { command } from "bdsx/command";
import cmd from "./room";

cmd.overload((_, origin, out) => {
    if (origin.getOriginType() !== CommandOriginType.Player) return out.error('This command can only be executed by players.');

    const player = origin.getEntity() as ServerPlayer;
    const room = ChatRoom.find(player);
    if (!room) return out.error('You are not in any room');

    const { playerLeft } = configuration.data.room;
    room.leave(player);
    room.broadcast(setPlaceholders(playerLeft, player));
    out.success(`You left the ${room.name} room`);
}, {
    leave: command.enum('option.leave', 'leave')
});