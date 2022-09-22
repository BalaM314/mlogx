/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various classes.
*/

import chalk from "chalk";
import { extend, isKey } from "./funcs.js";
import { ArgType } from "./types.js";

/**Represents an argument(type) for a command.*/
export interface Arg {
	type:ArgType,
	name:string,
	isOptional:boolean,
	isGeneric:boolean,
	isVariable:boolean,
	spread:boolean
}

export class CompilerError extends Error {
	constructor(message:string){
		super(message);
		this.name = "CompilerError";
	}
}

//TODO move this to a file called Log.ts
const logLevels = extend<{
	[index:string]: [color: (input:string) => string, tag:string]
}>()({
	"debug": [chalk.gray, "[DEBUG]"],
	"info": [chalk.white, "[INFO]"],
	"warn": [chalk.yellow, "[WARN]"],
	"err": [chalk.red, "[ERROR]"],
	"fatal": [chalk.bgRed.white, "[FATAL]"],
	"announce": [chalk.blueBright, ""],
	"none": [m => m, ""],
});
type logLevel = keyof typeof logLevels;

interface MessageData {
	[id:string]: {
		for: (data:never) => string,
		level: logLevel
	}
}
const messages = extend<MessageData>()({
	"unknownRequire": {for:(d:{requiredVar:string}) => `Unknown require ${d.requiredVar}`, level: "warn"}
});

export class Log {
	static level: logLevel;
	static printWithLevel(level:logLevel, message:string){
		this.level = level;
		console.log(logLevels[level][0](`${logLevels[level][1]}${logLevels[level][1].length == 0 ? "" : "\t"}${message}`));
	}
	/**For debug information. */
	static debug(message:string){this.printWithLevel("debug", message);}
	/**Dumps objects */
	static dump(level:logLevel, ...objects:unknown[]):void;
	static dump(...objects:unknown[]):void;
	static dump(...objects:unknown[]){
		const firstArg = objects[0];
		if(isKey(logLevels, firstArg)){
			this.level = firstArg;
			console.log(logLevels[this.level] + "\t", ...(objects.slice(1)));
		} else {
			console.log(logLevels[this.level] + "\t", ...objects);
		}
	}
	/**For general info. */
	static info(message:string){this.printWithLevel("info", message);}
	/**Warnings */
	static warn(message:string){this.printWithLevel("warn", message);}
	/**Errors */
	static err(message:string){this.printWithLevel("err", message);}
	/**Fatal errors */
	static fatal(message:string){this.printWithLevel("fatal", message);}
	/**Used by the program to announce what it is doing. */
	static announce(message:string){this.printWithLevel("announce", message);}
	/**Just prints a message without any formatting */
	static none(message:string){this.printWithLevel("none", message);}

	static printMessage<ID extends keyof typeof messages, MData extends (typeof messages)[ID]>(
		messageID:ID, data:Parameters<MData["for"]>[0]
	){
		const message = messages[messageID];
		Log[message.level](message.for(data));
	}
}
