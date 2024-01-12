import { command } from "bdsx/command";
import { configuration } from "../../index";
import bchat from "./bchat";

bchat.overload((_param, origin, output) => {
    if (!origin.isServerCommandOrigin()) return output.error('This command can only be executed by console');

    configuration.update();
    output.success('Configuration has been updated'.green);
}, {
    config: command.enum('option.config', 'config'),
    reload: command.enum('option.reload', 'reload')
});