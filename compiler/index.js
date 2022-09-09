import { fileURLToPath } from 'url';
import { Log } from './src/classes.js';
import { mlogx } from './src/mlogx.js';
export * from "./src/classes.js";
export * from "./src/commands.js";
export * from "./src/compile_fs.js";
export * from "./src/compile.js";
export * from "./src/consts.js";
export * from "./src/funcs.js";
export * from "./src/generic_args.js";
export { mlogx as app } from "./src/mlogx.js";
export * from "./src/types.js";
if (process.argv[1] == fileURLToPath(import.meta.url)) {
    Log.warn(`Running index.js is deprecated, please run cli.js instead.`);
    mlogx.run(process.argv);
}
