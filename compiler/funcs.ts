/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { Arg, CompilerError } from "./classes.js";
import commands from "./commands.js";
import { ArgType, CommandDefinition, CommandDefinitions, CommandError, CommandErrorType, GenericArgType, NamespaceStackElement, PreprocessedCommand, PreprocessedCommandDefinitions, Settings, StackElement } from "./types.js";
import * as readline from "readline";
import { buildingNameRegex } from "./consts.js";
import { ForStackElement } from "./types.js";


/**Processes commands(adds in what would otherwise be boilerplate). */
export function processCommands(preprocessedCommands:PreprocessedCommandDefinitions):CommandDefinitions {

	function arg(str:`${string}:${"*"|""}${string}${"?"|""}`){
		if(!str.includes(":")){
			return new Arg(str, str, false, false, false);
		}
		let [name, type] = str.split(":");
		let isVariable = false;
		let isOptional = false;
		if(type.startsWith("*")){
			isVariable = true;
			type = type.substring(1);
		}
		if(type.endsWith("?")){
			isOptional = true;
			type = type.substring(0, type.length - 1);
		}
		return new Arg(type, name, isOptional, true, isVariable);
	}

	let out:CommandDefinitions = {};
	for(let [name, commands] of Object.entries(preprocessedCommands)){
		out[name] = [];
		for(let command of commands){
			let processedCommand:CommandDefinition = {
				description: command.description,
				name,
				args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg as any)) : [],
				getVariablesDefined: command.getVariablesDefined
			}
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
				processedCommand.replace = (command.replace as (args:string[]) => string[]);
			}
			out[name].push(processedCommand);
		}
	}
	return out;
}

/**Returns if an argument is generic or not. */
export function isGenericArg(val:string): val is GenericArgType {
	return GenericArgType[val as GenericArgType] != undefined;
}

/**Estimates the type of an argument. May not be right.*/
export function typeofArg(arg:string):GenericArgType {
	if(arg == "") return GenericArgType.invalid;
	if(arg == undefined) return GenericArgType.invalid;
	if(arg.match(/@[a-z\-]+/i)){
		if(arg == "@unit") return GenericArgType.unit;
		if(arg == "@thisx") return GenericArgType.number;
		if(arg == "@thisy") return GenericArgType.number;
		if(arg == "@this") return GenericArgType.building;
		if(arg == "@ipt") return GenericArgType.number;
		if(arg == "@links") return GenericArgType.number;
		if(arg == "@time") return GenericArgType.number;
		if(arg == "@tick") return GenericArgType.number;
		if(arg == "@mapw") return GenericArgType.number;
		if(arg == "@maph") return GenericArgType.number;
		if(arg == "@counter") return GenericArgType.variable;
		return GenericArgType.type;
	}
	if(arg.match(/:\w+/i)) return GenericArgType.ctype;
	if(["null"].includes(arg)) return GenericArgType.null;
	if(["equal", "notEqual", "strictEqual", "greaterThan", "lessThan", "greaterThanEq", "lessThanEq", "always"].includes(arg)) return GenericArgType.operandTest;
	// if(["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg)) return GenericArgType.targetClass;
	// if(["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"].includes(arg)) return GenericArgType.buildingGroup;
	if(["true", "false"].includes(arg)) return GenericArgType.boolean;
	if(arg.match(/^-?\d+(\.\d+)?$/)) return GenericArgType.number;
	if(arg.match(/^"[^"]*"$/gi)) return GenericArgType.string;
	if(arg.match(buildingNameRegex)) return GenericArgType.building;
	if(arg.match(/^[^"]+$/i)) return GenericArgType.variable;
	return GenericArgType.invalid;
}

/**Returns if an arg is of a specified type. */
export function isArgOfType(argToCheck:string, arg:Arg):boolean {
	if(arg.type === GenericArgType.any) return true;
	if(arg.type === GenericArgType.valid) return true;
	if(argToCheck == "") return false;
	if(argToCheck == undefined) return false;
	if(!isGenericArg(arg.type)){
		return argToCheck === arg.type;
	}
	let knownType:GenericArgType = typeofArg(argToCheck);
	if(arg.isVariable) return knownType == GenericArgType.variable;
	if(knownType == arg.type) return true;
	switch(arg.type){
		case GenericArgType.ctype:
			return /:\w+/.test(argToCheck);
		case GenericArgType.number:
			return knownType == GenericArgType.boolean || knownType == GenericArgType.variable;
		case GenericArgType.jumpAddress:
			return knownType == GenericArgType.number || knownType == GenericArgType.variable;
		case GenericArgType.boolean:
			return knownType == GenericArgType.number || knownType == GenericArgType.variable;
		case GenericArgType.type:
		case GenericArgType.string:
		case GenericArgType.building:
		case GenericArgType.unit:
		case GenericArgType.function:
			return knownType == GenericArgType.variable;
		case GenericArgType.targetClass:
			return ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(argToCheck);
		case GenericArgType.buildingGroup:
			return ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"].includes(argToCheck)
		case GenericArgType.operandTest:
			return [
				"equal", "notEqual", "strictEqual", "greaterThan",
				"lessThan", "greaterThanEq", "lessThanEq", "always"
			].includes(argToCheck);
		case GenericArgType.operand:
			if(["atan2", "dst"].includes(argToCheck)){
				console.warn(`${argToCheck} is deprecated.`);
				return true;
			}
			return [
				"add", "sub", "mul", "div", "idiv", "mod", "pow",
				"equal", "notEqual", "land", "lessThan", "lessThanEq",
				"greaterThan", "greaterThanEq", "strictEqual",
				"shl", "shr", "or", "and", "xor", "not", "max",
				"min", "angle", "len", "noise", "abs", "log",
				"log10", "floor", "ceil", "sqrt", "rand", "sin",
				"cos", "tan", "asin", "acos", "atan"
			].includes(argToCheck);
		case GenericArgType.lookupType:
			return ["building", "unit", "fluid", "item"].includes(argToCheck);
		case GenericArgType.targetClass:
			return [
				"any", "enemy", "ally", "player", "attacker",
				"flying", "boss", "ground"
			].includes(argToCheck);
		case GenericArgType.unitSortCriteria:
			return ["distance", "health", "shield", "armor", "maxHealth"].includes(argToCheck);
		case GenericArgType.valid:
			return true;//todo this needs intellijence
	}
	return false;
}

/**Cleans a line by removing trailing/leading whitespaces/tabs, and comments. */
export function cleanLine(line:string):string {
	return removeTrailingSpaces(removeComments(line));
}

export function removeTrailingSpaces(line:string):string {
	return line
		.replace(/(^[ \t]+)|([ \t]+$)/g, "");
}

export function replaceCompilerConstants(line:string, variables: {[index: string]: string;}):string {
	for(let [key, value] of Object.entries(variables)){
		line = line.replaceAll(`$${key}`, value);
	}
	return line;
}

export function parseIcons(data:string[]): {[index: string]: string;} {
	let icons: {
		[index: string]: string;
	} = {};
	for(let line of data){
		try {
			icons["_" + line.split("=")[1].split("|")[0]] = String.fromCodePoint(parseInt(line.split("=")[0]));
		} catch(err){
			//ignore RangeError
		}
	}
	return icons;
}

/**Adds jump labels to vanilla MLOG code that uses jump indexes. */
export function addJumpLabels(code:string[]):string[] {
	let lastJumpNameIndex = 0;
	let jumps: {
		[index: string]: string;
	} = {};
	let transformedCode:string[] = [];
	let outputCode:string[] = [];

	let cleanedCode = code.map(line => cleanLine(line)).filter(line => line);

	//Identify all jump addresses
	for(let line of cleanedCode){
		let label = getJumpLabelUsed(line);
		if(label){
			if(label == "0"){
				jumps[label] = "0"
			} else if(!isNaN(parseInt(label))){
				jumps[label] = `jump_${lastJumpNameIndex}_`
				lastJumpNameIndex += 1
			}
		}
	}

	//Replace jump addresses with jump labels
	for(let line of cleanedCode){
		if(getCommandDefinition(line) == commands.jump[0]){
			let label = getJumpLabelUsed(line);
			if(label == undefined) throw new Error("invalid jump statement");
			transformedCode.push(
				transformCommand(
					splitLineIntoArguments(line),
					commands.jump[0],
					//Replace arguments
					(arg:string, carg:Arg) => jumps[arg] ?? (() => {throw new Error(`Unknown jump label ${arg}`)})(),
					//But only if the argument is a jump address
					(arg:string, carg:Arg) => carg.isGeneric && carg.type == GenericArgType.jumpAddress
				).join(" ")
			);
		} else {
			transformedCode.push(line);
		}
	}

	//Add jump labels
	for(let lineNumber in transformedCode){
		const jumpLabel = jumps[(+lineNumber).toString()];
		if(jumpLabel){
			outputCode.push(`${jumpLabel}: #AUTOGENERATED`);
		}
		outputCode.push(transformedCode[lineNumber]);
	}

	return outputCode;

}

//The entirety of the code of "bettermlog". Nice that it ended up being useful.
export function removeComments(line:string):string {
	let charsplitInput = line.split("");
	let parsedChars = [];

	let lastChar = "";
	let state = {
		inSComment: false,
		inMComment: false,
		inDString: false
	};
	for(let _char in charsplitInput){
		let char = charsplitInput[_char];
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

export function getParameters(program:string[]):[name:string, type:string][]{
	let functionLine = program.filter(line => line.startsWith("#function "))[0];
	return functionLine
		?.match(/(?<=#function .*?\().*?(?=\))/)
		?.[0]
		?.split(",")
		.map(arg => removeTrailingSpaces(arg).split(":") as [string, string])
		.filter(arg => arg.length == 2) ?? [];
}

/**Splits a line into arguments, taking quotes into account. */
export function splitLineIntoArguments(line:string):string[] {
	if(line.includes(`"`)){
		//aaaaaaaaaaaaaaaaa
		let replacementLine = [];
		let isInString = false;
		for(let char of line){
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
		return line.split(" ");
	}
}

/**Uses a function to transform variables in a command. */
export function transformVariables(args:string[], commandDefinition:CommandDefinition, transformFunction: (arg:string) => string){
	return transformCommand(args, commandDefinition, transformFunction, 
		(arg:string, commandArg:Arg|undefined) => (
			commandArg?.isVariable || (acceptsVariable(commandArg)
			&& isArgOfType(arg, new Arg(GenericArgType.variable)))
		) && arg !== "_"
	);
}

export function transformCommand(args:string[], commandDefinition:CommandDefinition, transformFunction: (arg:string, commandArg:Arg) => string, filterFunction:(arg:string, commandArg:Arg) => boolean){
	return args
	.map((arg, index) => [arg, commandDefinition.args[index - 1]] as [name:string, arg:Arg|undefined])
	.map(([arg, commandArg]) => 
		(commandArg && filterFunction(arg, commandArg))
		? transformFunction(arg, commandArg) : arg
	);
}

export function addNamespaces(variable:string, stack:StackElement[]):string {
	return `_${(stack.filter(el => el.type == "namespace") as NamespaceStackElement[]).map(el => el.name).join("_")}_${variable}`;
}

export function prependFilenameToArg(arg:string, isMain:boolean, filename:string){
	return arg.startsWith("__") ? `__${isMain ? "" : filename.replace(/\.mlogx?/gi, "")}${arg}` : arg;
}

export function addNamespacesToLine(args:string[], commandDefinition:CommandDefinition, stack:StackElement[]):string {
	if(!inNamespace(stack)) return args.join(" ");
	// if(args[0] == "jump"){
	// 	//special handling for labels todo maybe remove
	// 	return transformCommand(args, commandDefinition, (variable:string) => addNamespaces(variable, namespaceStack), 
	// 		(arg:string, commandArg:Arg|undefined) => commandArg?.type == GenericArgType.jumpAddress
	// 	).join(" ");
	// }
	return transformVariables(args, commandDefinition, (variable:string) => addNamespaces(variable, stack)).join(" ");
}

/**Gets the variables defined by a command, given a list of arguments and a command definition. */
export function getVariablesDefined(args:string[], commandDefinition:CommandDefinition): [name:string, type:ArgType][]{
	if(commandDefinition.getVariablesDefined){
		return commandDefinition.getVariablesDefined(args);
	}
	return args
		.map((arg, index) => [arg, commandDefinition.args[index]] as [name:string, arg:Arg|undefined])
		.filter(([arg, commandArg]) => commandArg && commandArg.isVariable && arg !== "_")
		.map(([arg, commandArg]) => [arg, commandArg!.type]);
}

/**Returns if the stack contains a for loop. */
export function inForLoop(stack:StackElement[]):boolean {
	return stack.filter(el => el.type == "&for").length != 0;
}

/**Returns the topmost for loop in the stack. */
export function topForLoop(stack:StackElement[]):ForStackElement | undefined {
	return stack.filter(el => el.type == "&for").at(-1) as ForStackElement;
}

/**Returns if the stack contains a namespace. */
export function inNamespace(stack:StackElement[]):boolean {
	return stack.filter(el => el.type == "namespace").length != 0;
}

/**
 * Gets all possible variable usages.
 * Needed because, for example, the `sensor` command accepts either a building or a unit, so if you have `sensor foo.x foo @x`
 * foo is either being used as a unit or a building.
 */
export function getAllPossibleVariablesUsed(command:string): [name:string, types:ArgType[]][]{
	let args = splitLineIntoArguments(command).slice(1);
	let variablesUsed_s = [];
	for(let commandDefinition of getCommandDefinitions(command)){
		variablesUsed_s.push(getVariablesUsed(args, commandDefinition));
	};
	let variablesToReturn: {
		[index:string]: ArgType[]
	} = {};
	for(let variablesUsed of variablesUsed_s){
		 for(let [variableName, variableType] of variablesUsed){
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
			typeofArg(arg) == GenericArgType.variable && acceptsVariable(commandArg) && arg != "_"
		).map(([arg, commandArg]) => [arg, commandArg.type]);
}

export function getJumpLabelUsed(line:string): string | null {
	let args = splitLineIntoArguments(line);
	if(args[0] == "jump") return args[1];
	return null;
}

/**Checks if any of the inputs are compatible with the output type.*/
export function areAnyOfInputsCompatibleWithType(inputs:ArgType[], output:ArgType):boolean{
	for(let input of inputs){
		if(typesAreCompatible(input, output) || typesAreCompatible(output, input)) return true;
	}
	return false;
}

/**Checks if two types are compatible. */
export function typesAreCompatible(input:ArgType, output:ArgType):boolean {
	if(input == output) return true;
	if(output == GenericArgType.any) return true;
	if(output == GenericArgType.valid) return true;
	if(output == GenericArgType.null) return true;//TODO make sure this doesn't cause issues
	switch(input){
		case GenericArgType.any: return true;
		case GenericArgType.number: return output == GenericArgType.boolean;
		case GenericArgType.boolean: return output == GenericArgType.number;
		default: return false;
	}
}

/**Checks if an argument accepts a variable as input. */
export function acceptsVariable(arg: Arg|undefined):boolean {
	if(arg == undefined) return false;
	if(arg.isVariable) return false;
	if(arg.isGeneric)
		return [
			GenericArgType.boolean, GenericArgType.building,
			GenericArgType.number, GenericArgType.string,
			GenericArgType.type, GenericArgType.unit,
			GenericArgType.valid
		].includes(arg.type as GenericArgType);
	else
		return false;
}

export function getLabel(cleanedLine:string):string|undefined {
	return cleanedLine.match(/^[^ ]+(?=:$)/)?.[0];
}

export function isCommand(line:string, command:CommandDefinition): [valid:false, error:CommandError] | [valid:true, error:null] {
	let args = splitLineIntoArguments(line);
	let commandArguments = args.slice(1);
	if(commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.isOptional).length){
		return [false, {
			type: CommandErrorType.argumentCount,
			message:
`Incorrect number of arguments for command "${args[0]}", see \`mlogx info ${args[0]}\``
		}];
	}

	for(let arg in commandArguments){
		if(!isArgOfType(commandArguments[+arg], command.args[+arg])){
			if(command.args[+arg].isGeneric)
				return [false, {
					type: CommandErrorType.type,
					message: `Type mismatch: value "${commandArguments[+arg]}" was expected to be of type "${command.args[+arg].isVariable ? "variable" : command.args[+arg].type}", but was of type "${typeofArg(commandArguments[+arg])}"`
				}];
			else
				return [false, {
					type: CommandErrorType.badStructure,
					message: `Incorrect argument: value "${commandArguments[+arg]}" was expected to be "${command.args[+arg].type}", but was "${typeofArg(commandArguments[+arg])}"`
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
	let args = splitLineIntoArguments(cleanedLine);

	let commandList = commands[args[0]];
	let possibleCommands = [];
	let errors = [];

	if(commandList == undefined){
		return returnErrors ? [[], [{
			type: CommandErrorType.noCommand,
			message: `Command ${args[0]} does not exist.`
		}]] : [];
	}

	for(let possibleCommand of commandList){
		const result = isCommand(cleanedLine, possibleCommand);
		if(result[0]){
			possibleCommands.push(possibleCommand)
		} else {
			errors.push(result[1]);
		}
	}
	
	if(returnErrors)
		return [ possibleCommands, errors ];
	else
		return possibleCommands;
}

/**Parses preprocessor directives from a program. */
export function parsePreprocessorDirectives(data:string[]): [string, string[], string] {
	let program_type:string = "unknown";
	let required_vars:string[] = [];
	let author = "unknown";
	for(let line of data){
		if(line.startsWith("#require ")){
			required_vars.push(...line.split("#require ")[1].split(",").map(el => el.replaceAll(" ", "")).filter(el => el != ""));
		}
		if(line.startsWith("#program_type ")){
			let type = line.split("#program_type ")[1];
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

/**oh no */
export function exit(message: string):never {
	console.error(message);
	process.exit(1);
}

export function askQuestion(query:string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise(resolve => rl.question(query, ans => {
		rl.close();
		resolve(ans);
	}))
}

