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
import { extend, formatLineWithPrefix, isKey } from "./funcs.js";
import { Settings } from "./settings.js";
import type { CompiledLine, Line, none, TData } from "./types.js";

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
	"compiling file": {for:(d:{filename:string}) => `Compiling file ${d.filename}`, level:"announce"},
	"compiling file failed": {for:(d:{filename:string}) => `Failed to compile file ${d.filename}!`, level:"err"},
	"assembling output": {for:(d:none) => `Compiled all files successfully.\nAssembling output:`, level:"announce"},
	"compilation complete": {for:(d:none) => `Compilation complete.`, level:"announce"},
	"settings.compilerVariables deprecated": {for:(d:none) => `settings.compilerVariables is deprecated, please use settings.compilerConstants instead.`, level:"warn"},
	"invalid config.json": {for:(err:Error) => `config.json file is invalid. (${err.message}) Using default settings.`, level:"err"},
	"no config.json": {for:(d:none) => `No config.json found, using default settings.`, level:"debug"},
	"project created": {for:(d:{dirname:string}) => `Successfully created a new project in ${d.dirname}`, level:"announce"},
	"program too long": {for:(d:none) => `Program length exceeded 999 lines. Running it in-game will silently fail.`, level:"err"},
	"invalid uncompiled command definition": {for:(d:CompiledLine) => `Tried to type check a line(${d[1].text} => ${d[0]}) with invalid uncompiled command definition. This may cause issues with type checking. This is an error with MLOGX.`, level:"err"},
	"variable redefined with conflicting type": {for:(d:{name:string, types:string[], settings:Settings, definitions:TData.variableDefinitions[string]}) =>
`Variable "${d.name}" was defined with ${d.types.length} different types. ([${d.types.join(", ")}])
	First definition:
${formatLineWithPrefix(d.definitions[0].line, d.settings, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(d.definitions.filter(v => v.variableType == d.types[1])[0].line, d.settings, "\t\t")}`
	, level:"warn"},
	"variable undefined": {for:(d:{name:string, line:Line, settings:Settings}) =>
`Variable "${d.name}" seems to be undefined.
${formatLineWithPrefix(d.line, d.settings)}`
	, level:"warn"},
	"jump label redefined": {for:(d:{jumpLabel:string, numDefinitions:number}) => `Jump label "${d.jumpLabel}" was defined ${d.numDefinitions} times.`, level:"warn"},
	"jump label missing": {for:(d:{jumpLabel:string}) => `Jump label "${d.jumpLabel}" is missing.`, level: "warn"},
	"line contains U+F4321": {for:(d:{line:Line, settings:Settings}) =>
`Line includes the character U+F4321 which may cause issues with argument parsing
${formatLineWithPrefix(d.line, d.settings)}`
	, level:"warn"},
	"cannot port invalid line": {for:(d:{line:Line}) =>
`Line cannot be ported as it is not valid for any known command definition
${formatLineWithPrefix(d.line, {filename: "unknown"} as Settings)}`
	, level:"warn"},
	"unknown compiler const": {for:(d:{name:string}) => `Unknown compiler const "${d.name}"`, level:"warn"},
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