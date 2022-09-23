/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Handles everything related to console output.
*/
/* eslint-disable @typescript-eslint/no-unused-vars */

import chalk from "chalk";
import { extend, isKey } from "./funcs.js";
import type { none } from "./types.js";

export interface LogLevels {
	[index:string]: [color: (input:string) => string, tag:string]
}
export const logLevels = extend<LogLevels>()({
	"debug": [chalk.gray, "[DEBUG]"],
	"info": [chalk.white, "[INFO]"],
	"warn": [chalk.yellow, "[WARN]"],
	"err": [chalk.red, "[ERROR]"],
	"fatal": [chalk.bgRed.white, "[FATAL]"],
	"announce": [chalk.blueBright, ""],
	"none": [m => m, ""],
});
export type logLevel = keyof typeof logLevels;

export interface Messages {
	[id:string]: {
		for: (data:never) => string,
		level: logLevel
	}
}

export const messages = extend<Messages>()({
	"unknown require": {for:(d:{requiredVar:string}) => `Unknown require ${d.requiredVar}`, level: "warn"},
	"wrong file ran": {for:(d:none) => `Running index.js is deprecated, please run cli.js instead.`, level: "warn"},
	"statement port failed": {for:(d:{name:string, statement:string, reason?:string}) => `Cannot port ${d.name} statement "${d.statement}" because ${d.reason ?? "it is invalid"}`, level: "err"},
	"if statement condition not boolean": {for:(d:{condition:string}) => `Condition in &if statement was "${d.condition}", expected true or false.`, level:"warn"},
	"compiler mode project but no src directory": {for:(d:none) => `Compiler mode set to "project" but no src directory found.`, level:"warn"},
	"files to compile": {for:(filelist:string[]) => `Files to compile: [${filelist.map(file => chalk.green(file)).join(", ")}]`, level:"announce"},
	//"name": {for:(d:{}) => ``, level:""},
});

export class Logger<_LogLevels extends LogLevels, _Messages extends Messages> {
	level:keyof _LogLevels = "info";
	constructor(public logLevels:_LogLevels, public messages:_Messages){}
	printWithLevel(level:logLevel, message:string){
		this.level = level;
		console.log(this.logLevels[level][0](`${logLevels[level][1]}${logLevels[level][1].length == 0 ? "" : "\t"}${message}`));
	}
	/**For debug information. */
	debug(message:string){this.printWithLevel("debug", message);}
	/**Dumps objects */
	dump(level:logLevel, ...objects:unknown[]):void;
	dump(...objects:unknown[]):void;
	dump(...objects:unknown[]){
		const firstArg = objects[0];
		if(isKey(this.logLevels, firstArg)){
			this.level = firstArg;
			console.log(this.logLevels[this.level][1] + "\t", ...(objects.slice(1)));
		} else {
			console.log(this.logLevels[this.level][1] + "\t", ...objects);
		}
	}
	/**For general info. */
	info(message:string){this.printWithLevel("info", message);}
	/**Warnings */
	warn(message:string){this.printWithLevel("warn", message);}
	/**Errors */
	err(message:string){this.printWithLevel("err", message);}
	/**Fatal errors */
	fatal(message:string){this.printWithLevel("fatal", message);}
	/**Used by the program to announce what it is doing. */
	announce(message:string){this.printWithLevel("announce", message);}
	/**Just prints a message without any formatting */
	none(message:string){this.printWithLevel("none", message);}

	printMessage<ID extends keyof _Messages, MData extends _Messages[ID]>(
		messageID:ID, data:Parameters<MData["for"]>[0]
	){
		const message = this.messages[messageID] as MData;
		//cursed
		this[message.level](message.for(data as never));
	}
}
export const Log = new Logger(logLevels, messages);