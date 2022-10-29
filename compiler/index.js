import "./src/consts.js";
import "./src/classes.js";
import "./src/Log.js";
import "./src/settings.js";
import { fileURLToPath } from 'url';
import { Log } from './src/Log.js';
import { mlogx } from './src/mlogx.js';
export * from "./src/classes.js";
export * from "./src/commands.js";
export * from "./src/compile_fs.js";
export * from "./src/compile.js";
export * from "./src/consts.js";
export * from "./src/funcs.js";
export * from "./src/args.js";
export { mlogx as app } from "./src/mlogx.js";
export * from "./src/types.js";
if (process.argv[1] == fileURLToPath(import.meta.url)) {
    Log.printMessage("wrong file ran", {});
    mlogx.run(process.argv);
}
