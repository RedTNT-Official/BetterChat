import { CommandOriginType } from "bdsx/bds/commandorigin";
import { ServerPlayer } from "bdsx/bds/player";
import { ChatRoom } from "../../modules/ChatRoom";
import { command } from "bdsx/command";
import cmd from "./room";

cmd.overload((_, origin, out) => {
    if (origin.getOriginType() !== CommandOriginType.Player) return out.error('This command can only be executed by players.');

    const player = origin.getEntity() as ServerPlayer;
    const room = ChatRoom.find(player);

    if (!room) return out.error('You are not in any group.');
    if (room.owner.xuid !== player.getXuid()) return out.error("You don't have permission to dissolve this chat room.");

    out.success(`§aRoom "${room.name}" has been dissolved.`);
}, {
    dissolve: command.enum('option.dissolve', 'dissolve')
});