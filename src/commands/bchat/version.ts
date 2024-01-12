import { command } from "bdsx/command";
import bchat from "./bchat";
import { configuration } from "../..";

bchat.overload((_param, _origin, output) => {
    const config = configuration.data;
    output.success(`BetterChat v${config.version}`);
}, {
    'version ': command.enum('version', 'version')
});

bchat.overload((_param, _origin, output) => {
    const config = configuration.data;
    output.success(`BetterChat v${config.version}`);
}, {
    'version ': command.enum('v', 'v')
});