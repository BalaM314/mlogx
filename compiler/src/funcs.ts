/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains a lot of utility functions.
*/

import { Arg, Log } from "./classes.js";
import { commands, compilerCommands } from "./commands.js";
import {
	ArgType, CommandDefinition, CommandDefinitions, CommandError, CommandErrorType, CompiledLine,
	CompilerCommandDefinitions, CompilerConst, CompilerConsts, Line, NamespaceStackElement,
	PreprocessedCommandDefinitions, PreprocessedCompilerCommandDefinitions, Settings, StackElement,
	TData, PreprocessedArg, StackElementMapping, PreprocessedCompilerCommandDefinitionGroup,
	CompilerCommandDefinitionGroup, CompilerCommandDefinition, GAT, ArgKey, PreprocessedCommand
} from "./types.js";
import { ForStackElement } from "./types.js";
import * as readline from "readline";
import chalk from "chalk";
import { GenericArgs } from "./generic_args.js";
import { bugReportUrl } from "./consts.js";



//#region argfunctions

/**Returns if an argument is generic or not. */
export function isGenericArg(val:string): val is GAT {
	return GenericArgs.has(val as GAT);
}

/**Estimates the type of an argument. May not be right.*/
export function typeofArg(arg:string):GAT {
	if(arg == "") return "invalid";
	if(arg == undefined) return "invalid";
	for(const [name, argKey] of GenericArgs.entries()){
		if(argKey.doNotGuess) continue;
		if(typeof argKey.validator == "function"){
			if(argKey.validator(arg)) return name;
		} else {
			for(const argString of argKey.validator){
				if(argString instanceof RegExp){
					if(argString.test(arg)) return name;
				} else {
					if(argString == arg) return name;
				}
			}
		}
	}
	return "invalid";
}

export function isArgValidForValidator(argToCheck:string, validator:ArgKey["validator"]):boolean {
	if(typeof validator == "function"){
		return validator(argToCheck);
	} else {
		for(const argString of validator){
			if(argString instanceof RegExp){
				if(argString.test(argToCheck)) return true;
			} else {
				if(argString == argToCheck) return true;
			}
		}
		return false;
	}
}

/**Returns if an arg is of a specified type. */
export function isArgValidForType(argToCheck:string, arg:ArgType, checkAlsoAccepts:boolean = true):boolean {
	if(argToCheck == "") return false;
	if(argToCheck == undefined) return false;
	if(!isGenericArg(arg)){
		return argToCheck === arg;
	}
	const argKey = GenericArgs.get(arg);
	if(!argKey) impossible();

	//Check if the string is valid for any excluded arg
	for(const excludedArg of argKey.exclude){
		if(!isKey(GenericArgs, excludedArg)){
			throw new Error(`Arg AST is invalid: generic arg type ${arg} specifies exclude option ${excludedArg} which is not a known generic arg type`);
		}
		const excludedArgKey = GenericArgs.get(excludedArg)!;
		//If it is valid, return false
		if(isArgValidForValidator(argToCheck, excludedArgKey.validator)) return false;
	}

	//If function is not being called recursively
	if(checkAlsoAccepts){
		for(const otherType of argKey.alsoAccepts){
			//If the arg is valid for another accepted type, return true
			if(isArgValidForType(argToCheck, otherType, false)) return true;
		}
	}

	return isArgValidForValidator(argToCheck, argKey.validator);

}

export function isArgValidFor(str:string, arg:Arg):boolean {
	if(arg.isVariable){
		return isArgValidForType(str, "variable");
	}
	return isArgValidForType(str, arg.type);
}

//#endregion
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
	const specifiedConsts = line.match(/(?<!\\\$\()(?<=\$\()[\w-.]+(?=\))/g);
	specifiedConsts?.forEach(key => {
		if(variables.has(key)){
			const value = variables.get(key)!;
			line = line.replace(`$(${key})`, value instanceof Array ? value.join(" ") : value.toString());
		} else {
			if(!ignoreUnknownCompilerConsts){
				Log.warn(`Unknown compiler const ${key}`);
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
		//aaaaaaaaaaaaaaaaa
		const replacementLine = [];
		let isInString = false;
		for(const char of cleanedLine){
			if(char == `"`){
				isInString = !isInString;
			}
			if(isInString && char == " "){
				replacementLine.push("\u{F4321}");
			} else {
				replacementLine.push(char);
			}
		}
		return replacementLine.join("").split(" ").map(arg => arg.replaceAll("\u{F4321}", " "));
		//smort logic so `"amogus sus"` is parsed as one arg
	} else {
		return cleanedLine.split(" ");
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
export function removeUnusedJumps(compiledProgram:string[], jumpLabelUsages:TData.jumpLabelsUsed):string[] {
	return compiledProgram.filter(line =>
		!getJumpLabel(line) || getJumpLabel(line)! in jumpLabelUsages
	);
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
	compiledCommandArgs:string[], compiledCommandDefinition:CommandDefinition,
	uncompiledCommandArgs:string[] = compiledCommandArgs, uncompiledCommandDefinition:CommandDefinition = compiledCommandDefinition
): [name:string, type:ArgType][]{
	if(uncompiledCommandDefinition.getVariablesDefined){
		//TODO check for edge cases.
		return uncompiledCommandDefinition.getVariablesDefined([uncompiledCommandDefinition.name, ...uncompiledCommandArgs]);
	}
	if(compiledCommandDefinition.getVariablesDefined){
		//TODO check for edge cases.
		return compiledCommandDefinition.getVariablesDefined([compiledCommandDefinition.name, ...compiledCommandArgs]);
	}
	return compiledCommandArgs
		.map((arg, index) => [arg, compiledCommandDefinition.args[index]] as [name:string, arg:Arg|undefined])
		.filter(([arg, commandArg]) => commandArg && commandArg.isVariable && arg !== "_")
		.map(([arg, commandArg]) => [arg, commandArg!.type]);
}

/**
 * Gets all possible variable usages.
 * Needed because, for example, the `sensor` command accepts either a building or a unit, so if you have `sensor foo.x foo @x`
 * foo is either being used as a unit or a building.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAllPossibleVariablesUsed(compiledLine:string, uncompiledLine:string = compiledLine): [name:string, types:ArgType[]][]{
	const args = splitLineIntoArguments(compiledLine).slice(1);
	const variablesUsed_s = [];
	for(const commandDefinition of getCommandDefinitions(compiledLine)){
		variablesUsed_s.push(getVariablesUsed(args, commandDefinition));
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
		.map((arg, index) => [arg, commandDefinition.args[index]] as [name:string, arg:Arg])
		.filter(([arg, commandArg]) =>
			isArgValidForType(arg, "variable") && acceptsVariable(commandArg) && arg != "_"
		).map(([arg, commandArg]) => [arg, commandArg.type]);
}

/**Gets the jump label used in a statement. */
export function getJumpLabelUsed(line:string): string | null {
	const args = splitLineIntoArguments(line);
	if(args[0] == "jump") return args[1];
	return null;
}

/**Gets the jump label defined in a statement. */
export function getJumpLabel(cleanedLine:string):string | null {
	return cleanedLine.match(/^[^ ]+(?=:$)/)?.[0] ?? null;
}

//#endregion
//#region stack

/**Returns if the stack contains an element of a particular type. */
export function hasElement(stack:StackElement[], type:StackElement["type"]):boolean {
	return stack.filter(el => el.type == type).length != 0;
}

/** Returns if the stack contains a disabled if statement */
export function hasDisabledIf(stack:StackElement[]):boolean {
	return stack.filter(el => el.type == "&if" && !el.enabled).length != 0;
}

/**Returns the topmost for loop in the stack. */
export function topForLoop(stack:StackElement[]):ForStackElement | null {
	return stack.filter(el => el.type == "&for").at(-1) as ForStackElement ?? null;
}


//#endregion
//#region typechecking
/**Checks if any of the inputs are compatible with the output type.*/
export function areAnyOfInputsCompatibleWithType(inputs:ArgType[], output:ArgType):boolean{
	for(const input of inputs){
		if(typesAreCompatible(input, output) || typesAreCompatible(output, input)) return true;
	}
	return false;
}

/**Checks if two types are compatible. */
export function typesAreCompatible(input:ArgType, output:ArgType):boolean {
	if(input == output) return true;
	if(output == "any") return true;
	if(output == "null") return true;//TODO make sure this doesn't cause issues
	switch(input){
		case "any": return true;
		case "number": return output == "boolean";
		case "boolean": return output == "number";
		default: return false;
	}
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
	const commandArguments = args.slice(1);
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

	const commandList = commands[args[0]];
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
//#region misc

/**Displays a Line. */
export function formatLine(line:Line, settings:Settings):string {
	return chalk.gray(`${settings.filename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}

/**Displays a Line with a prefix before it. */
export function formatLineWithPrefix(line:Line, settings:Settings, prefix:string = "\t\tat "):string {
	return chalk.gray(`${prefix}${settings.filename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}

/**Adds a source line to a multiple lines of code. */
export function addSourcesToCode(code:string[], sourceLine:Line = {text: `not provided`, lineNumber:2}):CompiledLine[]{
	return code.map(compiledLine => [compiledLine, sourceLine] as CompiledLine);
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

/**Converts an arg string into an Arg. */
export function arg(str:PreprocessedArg):Arg {
	const matchResult = str.match(/(\.\.\.)?(\w+):(\*)?(\w+)(\?)?/);
	if(!matchResult){
		if(str.includes(":")){
			Log.warn(`Possibly bad arg string ${str}, assuming it means a non-generic arg`);
		}
		return makeArg(str, str, false, false, false);
	}
	const [, spread, name, isVariable, type, isOptional] = matchResult;
	return makeArg(type, name, !! isOptional, isGenericArg(type), !! isVariable, !! spread);
}

/**Makes an arg using ordered arguments */
export function makeArg(type:string, name:string = "WIP", isOptional:boolean = false, isGeneric:boolean = true, isVariable:boolean = false, spread:boolean = false){
	return {
		type, name, isOptional, isGeneric, isVariable, spread
	};
}

/**
 * Processes commands(adds in what would otherwise be boilerplate). 
 * Warning: called before execution.
 **/
export function processCommands<IDs extends string>(preprocessedCommands:PreprocessedCommandDefinitions<IDs>):CommandDefinitions<IDs> {

	const out:Partial<CommandDefinitions<IDs>> = {};
	for(const [name, commands] of (Object.entries(preprocessedCommands) as [name:IDs, commands:PreprocessedCommand[]][])){
		out[name] = [];
		for(const command of commands){
			const processedCommand:CommandDefinition = {
				type: "Command",
				description: command.description,
				name: name,
				args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg as PreprocessedArg)) : [],
				getVariablesDefined: command.getVariablesDefined,
				getVariablesUsed: command.getVariablesUsed,
				port: command.port
			};
			if(command.replace instanceof Array){
				processedCommand.replace = function(args:string[]){
					return (command.replace as string[]).map(replaceLine => {
						for(let i = 1; i < args.length; i ++){
							replaceLine = replaceLine.replace(new RegExp(`%${i}`, "g"), args[i]);
						}
						return replaceLine;
					});
				};
			} else if(typeof command.replace == "function"){
				processedCommand.replace = command.replace;
			}
			out[name]!.push(processedCommand);
		}
	}
	return out as CommandDefinitions<IDs>;
}

export function processCompilerCommands(preprocessedCommands:PreprocessedCompilerCommandDefinitions):CompilerCommandDefinitions {
	const out:Partial<CompilerCommandDefinitions> = {};
	for(const [id, group] of Object.entries(preprocessedCommands) as [keyof StackElementMapping, PreprocessedCompilerCommandDefinitionGroup<StackElementMapping[keyof StackElementMapping]>][]){
		out[id] = {
			stackElement: group.stackElement,
			overloads: []
		};

		type _PreprocessedCompilerCommandDefinitionGroup<T> = T extends infer A ? PreprocessedCompilerCommandDefinitionGroup<A> : never;
		// interface SusCompilerCommandDefinition<StackEl> {
		// 	type: "CompilerCommand"
		// 	args: Arg[];
		// 	name: string;
		// 	description: string;
		// 	onbegin?: CompilerCommandDefinition<StackEl>["onbegin"] | PreprocessedCompilerCommandDefinition<StackEl>["onbegin"];
		// 	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		// 		compiledCode:CompiledLine[];
		// 		skipTypeChecks?:boolean;
		// 	}
		// 	onend?: (line:Line, removedStackElement:StackEl) => {
		// 		compiledCode:CompiledLine[];
		// 		skipTypeChecks?:boolean;
		// 	};
		// }
		// type SussierCompilerCommandDefinition<T> = T extends infer A ? SusCompilerCommandDefinition<A> : never;
		for(const command of (group as _PreprocessedCompilerCommandDefinitionGroup<StackElement>).overloads){
			/**
			 * Time for a rant.
			 * The onbegin() function of a command definition must return a stack element which points back to the command definition.
			 * This means I have to create the command definition and then modify the onbegin() prop.
			 * This causes typescript to yell at me.
			 * I tried low-level black magic for 30 minutes but couldn't get it to work.
			 * Therefore:
			 */
			//eslint-disable-next-line @typescript-eslint/no-explicit-any
			const commandDefinition:any = {
				type: "CompilerCommand",
				description: command.description,
				name: id,
				args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg as PreprocessedArg)) : [],
				onbegin: command.onbegin,
				oninblock: command.oninblock,
				onend: command.onend
			};
			if(commandDefinition.onbegin){
				const oldFunction = commandDefinition.onbegin!;
				commandDefinition.onbegin = (args:string[], line:Line, stack:StackElement[]) => {
					const outputData = oldFunction(args, line, stack);
					return {
						...outputData,
						element: {
							...outputData.element,
							commandDefinition
						}
					};
				};
			}
			(out[id]!.overloads as CompilerCommandDefinitionGroup<StackElement>["overloads"]).push(commandDefinition as CompilerCommandDefinition<StackElement>);
		}
	}
	return out as CompilerCommandDefinitions;
}

/**Returns a list of numbers within two bounds inclusive */
export function range(min:number, max:number):number[];
export function range(min:number, max:number, strings:true):string[];
export function range(min:number, max:number, strings?:true):number[]|string[] {
	if(min > max) return [];
	return strings ? [...Array(max + 1 - min).keys()].map(i => (i + min).toString()) : [...Array(max + 1 - min).keys()].map(i => i + min);
}

export function getCompilerConsts(icons:Map<string, string>, settings:Settings):CompilerConsts {
	const outputMap = new Map<string, CompilerConst>();
	for(const [key, value] of icons){
		outputMap.set(key, value);
	}
	outputMap.set("name", settings.name);
	outputMap.set("authors", settings.authors.join(", "));
	outputMap.set("filename", settings.filename);
	for(const [key, value] of Object.entries(settings.compilerConstants)){
		outputMap.set(key, value);
	}
	return outputMap;
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
 * Example: the messages.message.for() function accepts arbitrary data as an input, and this should be available in typeof messages, but not having a fur() function should cause an error.
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

//#endregion
