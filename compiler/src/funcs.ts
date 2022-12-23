/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains a lot of utility functions.
*/

import chalk from "chalk";
import * as readline from "readline";
import { Options } from "cli-app";
import {
	Arg, ArgType, GenericArgs, isArgValidFor, isArgValidForType, isGenericArg, typeofArg
} from "./args.js";
import { CompilerError, Statement } from "./classes.js";
import { CommandDefinition, commands, CompilerCommandDefinition, compilerCommands } from "./commands.js";
import { bugReportUrl } from "./consts.js";
import { Log } from "./Log.js";
import type { GlobalState, Settings, State } from "./settings.js";
import { hasElement, NamespaceStackElement, StackElement } from "./stack_elements.js";
import {
	CommandError, CommandErrorType, CompilerConst, CompilerConsts, Line, TData, ValuesRecursive
} from "./types.js";


//#region linemanipulation

/**Cleans a line by removing trailing/leading whitespaces/tabs, and comments. */
export function cleanLine(line:string):string {
	return removeTrailingSpaces(removeComments(line));
}

/**Removes trailing/leading whitespaces and tabs from a line. */
export function removeTrailingSpaces(line:string):string {
	return line
		.replace(/(^[ \t]+)|([ \t]+$)/g, "");
}


//The entirety of the code of "bettermlog". Nice that it ended up being useful.
/**Removes single line and multiline comments from a line. */
export function removeComments(line:string):string {
	const charsplitInput = line.split("");
	const parsedChars = [];

	let lastChar = "";
	const state = {
		inSComment: false,
		inMComment: false,
		inDString: false
	};
	for(const _char in charsplitInput){
		const char = charsplitInput[_char];
		if(typeof char !== "string") continue;
		if(state.inSComment){
			if(char === "\n"){
				state.inSComment = false;
			}
			lastChar = char;
			continue;
		} else if(state.inMComment) {
			if(lastChar === "*" && char === "/"){
				state.inMComment = false;
			}
			lastChar = char;
			continue;
		} else if(state.inDString) {
			if(lastChar !== `\\` && char === `"`){
				state.inDString = false;
			}
		} else if(char === "#"){
			state.inSComment = true;
			lastChar = char;
			continue;
			//skip characters until next newline
		} else if(lastChar === "/" && char === "*"){
			state.inMComment = true;
			parsedChars.pop();
			lastChar = char;
			continue;
			//skip characters until "*/"
		} else if(lastChar !== `\\` && char === `"`){
			if(char === "\"" && lastChar !== `\\`){
				state.inDString = true;
			}
		} else if(lastChar === "/" && char === "/"){
			state.inSComment = true;
			parsedChars.pop();
			lastChar = char;
			continue;
		}
		lastChar = char;
		parsedChars.push(char);
	}
	
	return parsedChars.join("");
}

/**Replaces compiler constants in a line. */
export function replaceCompilerConstants(line:string, variables:CompilerConsts, ignoreUnknownCompilerConsts:boolean = false):string {
	const specifiedConsts = line.match(/(?<!\\\$\()(?<=\$\()[^()]+(?=\))/g);
	specifiedConsts?.forEach(key => {
		if(variables.has(key)){
			const value = variables.get(key)!;
			line = line.replace(`$(${key})`, value instanceof Array ? value.join(" ") : value.toString());
		} else {
			if(!ignoreUnknownCompilerConsts){
				Log.printMessage("unknown compiler const", {name: key});
			}
		}
	});
	if(!line.includes("$")) return line;
	for(const [key, value] of Array.from(variables).slice().sort((a, b) => b.length - a.length)){
		line = line.replaceAll(`$${key}`, value instanceof Array ? value.join(" ") : value.toString());
	}
	return line;
}

/**Splits a line into arguments, taking quotes into account. */
export function splitLineIntoArguments(cleanedLine:string):string[] {
	if(cleanedLine.includes(`"`)){
		const args:string[] = [""];
		let isInString = false;
		for(const char of cleanedLine){
			if(char == `"`){
				isInString = !isInString;
			}
			if(!isInString && char == " "){
				args.push("");
			} else {
				args[args.length - 1] += char;
			}
		}
		if(isInString) CompilerError.throw("unterminated string literal", {line: cleanedLine});
		return args;
		//smort logic so `"amogus sus"` is parsed as one arg
	} else {
		return cleanedLine.split(" ");
	}
}

/**Splits a line into arguments, taking quotes into account. */
export function splitLineOnSemicolons(cleanedLine:string):string[] {
	if(cleanedLine.includes(`"`)){
		const lines:string[] = [""];
		let isInString = false;
		for(const char of cleanedLine){
			if(char == `"`){
				isInString = !isInString;
			}
			if(isInString){
				lines[0] += char;
			} else if(char == ";"){
				lines.push("");
			} else {
				lines[0] += char;
			}
		}
		if(isInString) CompilerError.throw("unterminated string literal", {line: cleanedLine});
		return lines.map(cleanLine).filter(cleanedLine => cleanedLine != "");
		//smort logic so `"amogus sus"` is parsed as one arg
	} else {
		return cleanedLine.split(";").map(cleanLine).filter(cleanedLine => cleanedLine != "");
	}
}

//#endregion
//#region argBasedLineManipulation

/**Uses a function to transform variables in a command. */
export function transformVariables(args:string[], commandDefinition:CommandDefinition, transformFunction: (arg:string) => string){
	return transformCommand(args, commandDefinition, transformFunction,
		(arg:string, commandArg:Arg|undefined) => (
			commandArg?.isVariable || (acceptsVariable(commandArg)
			&& isArgValidForType(arg, "variable"))
		) && arg !== "_"
	);
}

/**Transforms a command given a list of args, command definition, a transformer function, and a filter function. */
export function transformCommand(args:string[], commandDefinition:CommandDefinition, transformFunction: (arg:string, commandArg:Arg) => string, filterFunction:(arg:string, commandArg:Arg) => boolean = () => true){
	return args
		.map((arg, index) => [arg, commandDefinition.args[index - 1]] as [name:string, arg:Arg|undefined])
		.map(([arg, commandArg]) =>
			(commandArg && filterFunction(arg, commandArg))
				? transformFunction(arg, commandArg) : arg
		);
}

/**Prepends namespaces on a stack to a variable. */
export function addNamespacesToVariable(variable:string, stack:StackElement[]):string {
	return `_${(stack.filter(el => el.type == "namespace") as NamespaceStackElement[]).map(el => el.name).join("_")}_${variable}`;
}

/**Prepends namespaces on the given stack to all variables in a line. */
export function addNamespacesToLine(args:string[], commandDefinition:CommandDefinition, stack:StackElement[]):string {
	if(!hasElement(stack, "namespace")) return args.join(" ");
	// if(args[0] == "jump"){
	// 	//special handling for labels todo maybe remove
	// 	return transformCommand(args, commandDefinition, (variable:string) => addNamespaces(variable, namespaceStack),
	// 		(arg:string, commandArg:Arg|undefined) => commandArg?.type == GenericArgType.jumpAddress
	// 	).join(" ");
	// }
	return transformVariables(args, commandDefinition, (variable:string) => addNamespacesToVariable(variable, stack)).join(" ");
}

/**Prepends the filename to an arg if it starts with two underscores. */
export function prependFilenameToArg(arg:string, isMain:boolean, filename:string){
	return arg.startsWith("__") ? `__${isMain ? "" : filename.replace(/\.mlogx?/gi, "")}${arg}` : arg;
}

/**Removes unused jumps from a compiled program. */
export function removeUnusedJumps(compiledProgram:Statement[], jumpLabelUsages:TData.jumpLabelsUsed):Statement[] {
	return compiledProgram.filter(line => {
		const labels = getJumpLabelsDefined(line.text);
		if(labels.length == 0) return true;
		return labels.some(label => label in jumpLabelUsages);
	});
}

export function interpolateString(input:string):{
	type: "string" | "variable";
	content: string;
}[]{
	const chunks: {
		type: "string" | "variable";
		content: string;
	}[] = [{
		type: "string",
		content: ""
	}];
	const chars = input.split("");
	while(chars[0]){
		const char = chars.shift();
		const chunk = chunks.at(-1)!;
		if(char == "{" || char == "}"){
			if(chunk.content.at(-1) == "\\"){
				//Remove the backslash and let the { be appended
				chunk.content = chunk.content.slice(0, -1);
			} else {
				//Start a new chunk of the other type if it is not the current type
				const type = char == "{" ? "variable" : "string";
				if(type != chunk.type){
					chunks.push({
						type,
						content: ""
					});
					continue;
				}
			}
		}
		chunks.at(-1)!.content += char;
	}
	return chunks.filter(chunk => chunk.content.length > 0);
}

//#endregion
//#region parsing

/**Parses icons out of the data in the icons.properties file from the Mindustry source code. */
export function parseIcons(data:string[]): Map<string, string> {
	const icons = new Map<string, string>();
	for(const line of data){
		if(!line || line.length <= 1) continue;
		try {
			icons.set(
				"_" + line.split("=")[1].split("|")[0].replaceAll("-","_"),
				String.fromCodePoint(parseInt(line.split("=")[0]))
			);
		} catch(err){
			if(!(err instanceof RangeError)){
				throw err;
			}
		}
	}
	return icons;
}

/**Gets function parameters from a program. */
export function getParameters(program:string[]):[name:string, type:string][]{
	const functionLine = program.filter(line => line.startsWith("#function "))[0];
	return functionLine
		?.match(/(?<=#function .*?\().*?(?=\))/)
		?.[0]
		?.split(",")
		.map(arg => removeTrailingSpaces(arg).split(":") as [string, string])
		.filter(arg => arg.length == 2) ?? [];
}

/**Parses preprocessor directives from a program. */
export function parsePreprocessorDirectives(data:string[]): [program_type:string, required_vars:string[], author:string] {
	let program_type:string = "unknown";
	const required_vars:string[] = [];
	let author = "unknown";
	for(const line of data){
		if(line.startsWith("#require ")){
			required_vars.push(...line.split("#require ")[1].split(",").map(el => el.replaceAll(" ", "")).filter(el => el != ""));
		}
		if(line.startsWith("#program_type ")){
			const type = line.split("#program_type ")[1];
			if(type == "never" || type == "main" || type == "function"){
				program_type = type;
			}
		}
		if(line.startsWith("#author ")){
			author = line.split("#author ")[1];
		}
	}

	return [program_type, required_vars, author];

}

//#endregion
//#region typereading

/**Gets the variables defined by a command, given a list of arguments and a command definition. */
export function getVariablesDefined(
	statement:Statement, compiledCommandDefinition:CommandDefinition
): [name:string, type:ArgType][]{
	if(statement.modifiedSource.commandDefinitions[0].getVariablesDefined){
		//TODO check for edge cases.
		return statement.modifiedSource.commandDefinitions[0].getVariablesDefined(statement.modifiedSource.args);
	}
	if(compiledCommandDefinition.getVariablesDefined){
		//TODO check for edge cases.
		return compiledCommandDefinition.getVariablesDefined(statement.args);
	}
	return statement.args
		.slice(1)
		.map((arg, index) => [arg, compiledCommandDefinition.args[index]] as [name:string, arg:Arg|undefined])
		.filter(([arg, commandArg]) => commandArg && commandArg.isVariable && arg !== "_")
		.map(([arg, commandArg]) => [arg, commandArg!.type]);
}

/**
 * Gets all possible variable usages.
 * Needed because, for example, the `sensor` command accepts either a building or a unit, so if you have `sensor foo.x foo @x`
 * foo is either being used as a unit or a building.
 */
export function getAllPossibleVariablesUsed(statement:Statement): [name:string, types:ArgType[]][]{
	const variablesUsed_s = [];
	for(const commandDefinition of statement.commandDefinitions){
		variablesUsed_s.push(getVariablesUsed(statement.args, commandDefinition));
	}
	const variablesToReturn: {
		[index:string]: ArgType[]
	} = {};
	for(const variablesUsed of variablesUsed_s){
		for(const [variableName, variableType] of variablesUsed){
			if(!variablesToReturn[variableName]) variablesToReturn[variableName] = [variableType];
			if(!variablesToReturn[variableName].includes(variableType)) variablesToReturn[variableName].push(variableType);
		}
	}
	return Object.entries(variablesToReturn);
}

/**Gets variables used for a specific command definition. */
export function getVariablesUsed(args:string[], commandDefinition:CommandDefinition): [name:string, type:ArgType][]{
	return args
		.slice(1)
		.map((arg, index) => [arg, commandDefinition.args[index]] as [name:string, arg:Arg])
		.filter(([arg, commandArg]) =>
			isArgValidForType(arg, "variable") && acceptsVariable(commandArg) && arg != "_"
		).map(([arg, commandArg]) => [arg, commandArg.type]);
}

/**Gets the jump label used in a statement. */
export function getJumpLabelsUsed(args:string[], commandDefinition:CommandDefinition):string[] {
	return args
		.slice(1)
		.map((arg, index) => [arg, commandDefinition.args[index]] as [name:string, arg:Arg])
		.filter(([, commandArg]) =>
			commandArg.type == "jumpAddress"
		).map(([arg]) => arg);
}

/**Gets the jump label defined in a statement. */
export function getJumpLabelsDefined(cleanedLine:string):string[] {
	const matchData = cleanedLine.match(/^[^ ]+(?=:$)/);
	if(matchData == null) return [];
	else return [matchData[0]];
	//TODO rewrite
}

//#endregion
//#region typechecking
/**Checks if any of the inputs are accepted by the output type.*/
export function areAnyOfInputsAcceptedByType(inputs:ArgType[], type:ArgType):boolean{
	for(const input of inputs){
		if(typeIsAccepted(input, type)) return true;
	}
	return false;
}

/**Checks if the input type is accepted by any output type.*/
export function isInputAcceptedByAnyType(input:ArgType, types:ArgType[]):boolean{
	for(const type of types){
		if(typeIsAccepted(input, type)) return true;
	}
	return false;
}

/**Checks if an input type is accepted by a type. */
export function typeIsAccepted(input:ArgType, type:ArgType):boolean {
	if(isGenericArg(type)){
		if(input == type) return true;
		if(type == "any" || type == "null") return true;
		if(input == "any" || input == "null") return true;
		const argKey = GenericArgs.get(type);
		if(!argKey) impossible();
		return argKey.alsoAccepts.includes(input);
	} else return input == type;
}

/**Checks if an argument accepts a variable as input. */
export function acceptsVariable(arg: Arg|undefined):boolean {
	if(arg == undefined) return false;
	if(arg.isVariable) return false;
	if(arg.isGeneric){
		if(!isKey(GenericArgs, arg.type)) impossible();
		return GenericArgs.get(arg.type)!.alsoAccepts.includes("variable");
	} else {
		return false;
	}
}

//#endregion
//#region commandchecking

/**Checks if a line is valid for a command definition. */
export function isCommand(cleanedLine:string, command:CommandDefinition | CompilerCommandDefinition<StackElement>): [valid:false, error:CommandError] | [valid:true, error:null] {
	const args = splitLineIntoArguments(cleanedLine);
	const commandArguments = command.checkFirstTokenAsArg ? args : args.slice(1);
	const maxArgs = command.args.map(arg => arg.spread ? Infinity : 1).reduce((a, b) => a + b, 0);
	const minArgs = command.args.filter(arg => !arg.isOptional).length;
	if(commandArguments.length > maxArgs || commandArguments.length < minArgs){
		return [false, {
			type: CommandErrorType.argumentCount,
			message:
`Incorrect number of arguments for command "${args[0]}", see \`mlogx info ${args[0]}\``
		}];
	}

	let numSpreadArgs = 0;
	for(const arg in command.args){
		const commandArg = command.args[+arg];
		const stringArg = commandArguments[+arg + numSpreadArgs];
		if(commandArg == undefined){
			Log.dump({
				args,
				commandArguments,
				maxArgs,
				minArgs
			});
			throw new Error(`Too many arguments were present for a command, but this was not properly detected.`);
		}
		if(stringArg == undefined){
			if(commandArg.isOptional) return [true, null];
			Log.dump({
				args,
				commandArguments,
				maxArgs,
				minArgs
			});
			throw new Error(`Not enough arguments were present for a command, but this was not properly detected.`);
		}
		if(commandArg.spread){
			if(command.args.slice(+arg + 1).filter(arg => arg.spread || arg.isOptional).length > 0){
				throw new Error(`Command definitions with more than one spread arg or optional args after a spread arg are not yet implemented.`);
			}
			numSpreadArgs = commandArguments.slice(+arg).length - command.args.slice(+arg + 1).length - 1;
		}
		if(!isArgValidFor(stringArg, commandArg)){
			if(commandArg.isGeneric)
				return [false, {
					type: CommandErrorType.type,
					message: `Type mismatch: value "${stringArg}" was expected to be of type "${commandArg.isVariable ? "variable" : commandArg.type}", but was of type "${typeofArg(stringArg)}"`
				}];
			else
				return [false, {
					type: CommandErrorType.badStructure,
					message: `Incorrect argument: value "${stringArg}" was expected to be "${commandArg.type}", but was "${typeofArg(stringArg)}"`
				}];
		}
	}

	return [true, null];
}

/**Gets the first valid command definition for a command. */
export function getCommandDefinition(cleanedLine:string): CommandDefinition | undefined {
	return getCommandDefinitions(cleanedLine)[0];
}


export function getCommandDefinitions(cleanedLine:string): CommandDefinition[];
export function getCommandDefinitions(cleanedLine:string, returnErrors:true): [CommandDefinition[], CommandError[]];

/**Gets all valid command definitions for a command. */
export function getCommandDefinitions(cleanedLine:string, returnErrors:boolean = false):
	CommandDefinition[] | [CommandDefinition[], CommandError[]] {
	const args = splitLineIntoArguments(cleanedLine);

	if(!isKey(commands, args[0])){
		return returnErrors ? [[], [{
			type: CommandErrorType.noCommand,
			message: `Command "${args[0]}" does not exist.`
		}]] : [];
	}

	const commandList = commands[args[0]].concat(
		Object.values(commands).flat().filter(def => def.checkFirstTokenAsArg)
	);
	const possibleCommands = [];
	const errors = [];

	for(const possibleCommand of commandList){
		const result = isCommand(cleanedLine, possibleCommand);
		if(result[0]){
			possibleCommands.push(possibleCommand);
		} else {
			errors.push(result[1]);
		}
	}
	
	if(returnErrors)
		return [ possibleCommands, errors ];
	else
		return possibleCommands;
}

export function getCompilerCommandDefinitions(cleanedLine:string):[CompilerCommandDefinition<StackElement>[], CommandError[]] {
	const args = splitLineIntoArguments(cleanedLine);

	if(!isKey(compilerCommands, args[0])){
		return [[], [{
			type: CommandErrorType.noCommand,
			message: `Compiler command "${args[0]}" does not exist.`
		}]];
	}

	const commandGroup = compilerCommands[args[0]];
	const possibleCommands:CompilerCommandDefinition<StackElement>[] = [];
	const errors = [];


	for(const possibleCommand of commandGroup.overloads as CompilerCommandDefinition<StackElement>[]){
		const result = isCommand(cleanedLine, possibleCommand);
		if(result[0]){
			possibleCommands.push(possibleCommand);
		} else {
			errors.push(result[1]);
		}
	}
	
	return [possibleCommands, errors];
	
}

//#endregion
//#region expressionParsing

//#endregion
//#region misc

/**Displays a Line. */
export function formatLine(line:Line):string {
	return chalk.gray(`${line.sourceFilename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}

/**Displays a Line with a prefix before it. */
export function formatLineWithPrefix(line:Line, prefix:string = "\t\tat "):string {
	return chalk.gray(`${prefix}${line.sourceFilename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}

/**Adds a source line to a multiple lines of code. */
export function addSourcesToCode(
	code:string[],
	cleanedSourceLine:Line = {text: `not provided`, lineNumber:0, sourceFilename: `unknown.mlogx`},
	sourceLine:Line = {text: `not provided`, lineNumber:0, sourceFilename: `unknown.mlogx`}
):Statement[]{
	return code.map(compiledLine => Statement.fromLines(compiledLine, sourceLine, cleanedSourceLine));
}

/**oh no */
export function exit(message: string):never {
	Log.fatal(message);
	process.exit(1);
}

/**Asks a question through the CLI. */
export function askQuestion(question:string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise(resolve => rl.question(question, answer => {
		rl.close();
		resolve(answer);
	}));
}

export async function askYesOrNo(question:string): Promise<boolean> {
	return ["y", "yes"].includes(await askQuestion(question));
}

export function isObject(thing:unknown):thing is Record<string, unknown> {
	return thing != null && typeof thing == "object" && !Array.isArray(thing);//js why
}

export function flattenObject<T extends Record<string, unknown>>(object:T, parentName?:string, output:Record<string, ValuesRecursive<T>> = {}){
	for(const key in object){
		const name = (parentName ? parentName + "." : "") + key;
		if(isObject(object[key])){
			flattenObject(object[key] as Record<string, unknown>, name, output);
		} else {
			output[name] = object[key] as ValuesRecursive<T>;
		}
	}
	return output;
}

/**Returns a list of numbers within two bounds inclusive */
export function range(min:number, max:number):number[];
export function range(min:number, max:number, strings:true):string[];
export function range(min:number, max:number, strings?:true):number[] | string[] {
	if(min > max) return [];
	return strings ? [...Array(max + 1 - min).keys()].map(i => (i + min).toString()) : [...Array(max + 1 - min).keys()].map(i => i + min);
}

export function getCompilerConsts(icons:Map<string, string>, state:GlobalState, projectInfo:State["project"]):CompilerConsts {
	const outputMap = new Map<string, CompilerConst>();
	for(const [key, value] of icons){
		outputMap.set(key, value);
	}
	outputMap.set("name", projectInfo.name);
	outputMap.set("authors", projectInfo.authors.join(", "));
	outputMap.set("filename", projectInfo.filename);
	for(const [key, value] of Object.entries(state.compilerConstants)){
		if(isObject(value)){
			for(const [k, v] of Object.entries(flattenObject(value))){
				outputMap.set(key + "." + k, v);
			}
		} else if(Array.isArray(value)){
			for(const [k, v] of value.entries()){
				outputMap.set(`${key}[${k + 1}]`, v);
			}
			outputMap.set(`${key}.length`, value.length);
			outputMap.set(key, value);
		} else {	
			outputMap.set(key, value);
		}
	}
	return outputMap;
}

export function getState(settings:Settings, directory:string, options:Options):GlobalState {
	return {
		project: {
			name: settings.name,
			authors: settings.authors,
			directoryPath: directory
		},
		compilerOptions: {
			...settings.compilerOptions
		},
		compilerConstants: {
			...settings.compilerConstants,
		},
		verbose: "verbose" in options.namedArgs
	};
}

export function getLocalState(state:GlobalState, filename:string, icons:Map<string, string>):State {
	const project = {
		...state.project,
		filename
	};
	return {
		...state,
		project,
		compilerConstants: getCompilerConsts(icons, state, project)
	};
}

export function impossible():never {
	throw new Error(
`Something happened that should not be possible.
If you are reading this, then there's an error with mlogx.
Please file a bug report at ${bugReportUrl}
Make sure to screenshot the stack trace below:`
	);
}

/**
 * A TS util function used for type wrangling ASTs.
 * Returns a function that causes TypeScript to force some data to conform to some interface, but include the specific types in the final output.
 * Example: the messages.message.for() function accepts arbitrary data as an input, and this should be available in typeof messages, but not having a for() function should cause an error.
 **/
export function extend<Struct>() {
	return <T extends Struct>(data:T) => data;
}

/**Returns if a thing is in an object. Useful to stop typescript complaining. */
export function isKey<T extends string>(obj:Record<T, unknown>, thing:unknown):thing is T;
export function isKey<T extends string>(obj:Map<T, unknown>, thing:unknown):thing is T;
export function isKey<T extends string>(obj:Record<T, unknown> | Map<T, unknown>, thing:unknown):thing is T {
	if(obj instanceof Map)
		return obj.has(thing as T);
	else
		return (thing as string) in obj;
}

/**Asserts that a variable is of a particular type. */
export function is<T>(input:unknown): asserts input is T {
	//
}

export function concat<K, V>(input1:Map<K, V>, input2:Map<K, V> | [K, V][]):Map<K, V> {
	return new Map<K, V>([
		...input1.entries(),
		...(input2 instanceof Array ? input2 : input2.entries())
	]);
}

//#endregion
