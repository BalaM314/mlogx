/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 

Exports all the things.
*/

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




if(process.argv[1] == fileURLToPath(import.meta.url)){
	Log.warn(`Running index.js is deprecated, please run cli.js instead.`);
  mlogx.run(process.argv);
}
