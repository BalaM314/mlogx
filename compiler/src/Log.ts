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
import { GenericArgs } from "./args/generic_args.js";
import { Statement } from "./classes.js";
import { extend, formatLineWithPrefix, isKey } from "./funcs.js";
import type { CommandError, Line, none } from "./types.js";

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
		for: (data:never) => string;
		level: logLevel | "throw";
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
	"invalid uncompiled command definition": {for:(d:{statement:Statement}) => `Tried to type check a line(\`${d.statement.cleanedSource.text}\` => \`${d.statement.text}\`) with invalid uncompiled command definition. This may cause issues with type checking. This is an error with MLOGX.`, level:"err"},
	"variable redefined with conflicting type": {for:(d:{name:string, types:string[], firstDefinitionLine:Line, conflictingDefinitionLine:Line}) =>
`Variable "${d.name}" was defined with ${d.types.length} different types. ([${d.types.join(", ")}])
	First definition:
${formatLineWithPrefix(d.firstDefinitionLine, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(d.conflictingDefinitionLine, "\t\t")}`
	, level:"warn"},
	"variable undefined": {for:(d:{name:string, line:Line}) =>
`Variable "${d.name}" seems to be undefined.
${formatLineWithPrefix(d.line)}`
	, level:"warn"},
	"jump label redefined": {for:(d:{jumpLabel:string, numDefinitions:number}) => `Jump label "${d.jumpLabel}" was defined ${d.numDefinitions} times.`, level:"warn"},
	"jump label missing": {for:(d:{jumpLabel:string}) => `Jump label "${d.jumpLabel}" is missing.`, level: "warn"},
	"cannot port invalid line": {for:(d:{line:Line}) =>
`Line cannot be ported as it is not valid for any known command definition
${formatLineWithPrefix(d.line)}`
	, level:"warn"},
	"unknown compiler const": {for:(d:{name:string}) => `Unknown compiler const "${d.name}"`, level:"warn"},
	"line invalid": {for:(d:{line:string}) => `Line "${d.line}" is invalid.`, level:"err"},
	"commands cannot contain spaces": {for:(d:none) => `Commands cannot contain spaces.`, level:"err"},
	"unknown command or gat": {for:(d:{name:string}) => `Unknown command or generic arg type "${d.name}"`, level:"err"},
	"command moved": {for:(d:{appname:string, command:string}) => `"${d.appname} --${d.command}" was moved to "${d.appname} ${d.command}"`, level:"err"},
	"verbose mode on": {for:(d:none) => `Verbose mode enabled`, level:"debug"},
	"file changes detected": {for:(d:{filename:string}) => `\nFile changes detected: ${d.filename}`, level:"announce"},
	"compiling folder": {for:(d:{name:string}) => `Compiling folder ${d.name}`, level:"announce"},
	"invalid path": {for:(d:{name:string, reason?:string}) => `Invalid path specified. Path ${d.name} ${d.reason ?? "does not exist."}.`, level:"err"},
	"adding jump labels": {for:(d:{filename:string}) => `Adding jump labels to file ${d.filename}`, level:"announce"},
	"writing to": {for:(d:{outPath:string}) => `Writing to ${d.outPath}`, level:"announce"},
	"cannot port mlogx": {for:(d:{path:string}) => `File ${d.path} is already mlogx. If you would like to port it again, please rename it to .mlog.`, level:"err"},
	"port successful": {for:(d:{filename:string}) => `Ported file ${d.filename} to mlogx.`, level:"announce"},
	"bad arg string": {for:(d:{name:string}) => `Possibly bad arg string "${d.name}", assuming it means a non-generic arg`, level:"warn"},
	"cannot compile dir": {for:(d:{dirname:string}) => `Cannot compile ${d.dirname}. For help, run "mlogx help".`, level:"err"},
	"cannot compile mlog file": {for:(d:none) => `Cannot compile a .mlog file. If you are trying to port it, use mlogx port. If you really want to compile it, change the extension to .mlogx.`, level:"err"},
	"unclosed blocks": {for:(d:none) => `There were unclosed blocks.`, level:"throw"},
	"type checking invalid commands": {for:(d:none) => `Type checking aborted because the program contains invalid commands.`, level:"throw"},
	"no block to end": {for:(d:none) => `No block to end`, level:"throw"},
	"genLabels contains label": {for:(d:{line:string}) => `Line ${d.line} contains a jump label. This code is only meant for direct processor output.`, level:"throw"},
	"genLabels invalid jump statement": {for:(d:{line:string}) => `Invalid jump statement\n\tat "${d.line}"`, level:"throw"},
	"unterminated string literal": {for:(d:{line:string}) => `Unterminated string literal at ${d.line}`, level:"throw"},
	"property not senseable": {for:(d:{property:string}) => `Property ${d.property} is not senseable.`, level:"throw"},
	"line matched no overloads": {for:(d:{commandName:string, errors?:CommandError[]}) => `Line did not match any overloads for command ${d.commandName}:` + (d.errors ? "\n" + d.errors.map(err => "\t" + err.message).join("\n") : ""), level:"throw"},
	"invalid sensor shorthand": {for:(d:{arg:string}) => `Invalid sensor statement, "${d.arg}" must be of type thing.property and cannot contain special characters.`, level:"throw"},
	"invalid type": {for:(d:{type:string}) => `Invalid type "${d.type}", valid types are ${Object.keys(GenericArgs).join(", ")}`, level:"throw"},
	"for loop invalid bound": {for:(d:{bound:string, value:string}) => `Invalid for loop syntax: ${d.bound} bound(${d.value}) is invalid`, level:"throw"},
	"for loop too many loops": {for:(d:{numLoops:number}) => `Invalid for loop syntax: number of loops(${d.numLoops}) is greater than 200`, level:"throw"},
	"for loop negative loops": {for:(d:{numLoops:number}) => `Invalid for loop syntax: number of loops(${d.numLoops}) is negative`, level:"throw"},
	//"": {for:(d:{}) => ``, level:"throw"},
});

export class Logger<_LogLevels extends LogLevels, _Messages extends Messages> {
	level:keyof _LogLevels = "info";
	throwWarnAndErr = false;
	constructor(public logLevels:_LogLevels, public messages:_Messages){}
	printWithLevel(level:logLevel, message:string){
		this.level = level;
		if(this.throwWarnAndErr && (level == "warn" || level == "err" || level == "fatal")) throw new Error(`${level} ${message}`);
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
			if(this.level == "announce" || this.level == "none") this.level = "debug";
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
		if(!message) throw new Error(`Attempted to print unknown message ${messageID as string}`);
		if(message.level == "throw") throw new Error(`Attempted to print CompilerError ${messageID as string} as message`);
		//cursed
		this[message.level](message.for(data as never));
	}
}
export const Log = new Logger(logLevels, messages);