import { CustomForm, FormInput, FormToggle } from "bdsx/bds/form";
import { CommandOriginType } from "bdsx/bds/commandorigin";
import { ServerPlayer } from "bdsx/bds/player";
import { ChatRoom, askPassword } from "../../modules/ChatRoom";
import { command } from "bdsx/command";
import cmd from "./room";

cmd.overload((_, origin, out) => {
    if (origin.getOriginType() !== CommandOriginType.Player) return out.error('This command can only be executed by players.');

    const player = origin.getEntity() as ServerPlayer;
    createRoom(player);
}, {
    create: command.enum('option.create', 'create')
});

async function createRoom(player: ServerPlayer) {
    const netID = player.getNetworkIdentifier();

    const form = new CustomForm('Create Room');
    form.addComponent(new FormInput('Enter room name', 'Creeper Team'));
    form.addComponent(new FormToggle('Private', false));

    form.sendTo(netID, async (data) => {
        console.log(data);
        const response: [string, boolean] = data.response;
        const access = response[1] ? 'private' : 'public';

        const password = access === 'private' ? await askPassword(player, true) : undefined;
        const room = new ChatRoom(player, response[0], access, password);

        player.sendMessage(`§aRoom "${room.name}" has been created.`);
    });
}