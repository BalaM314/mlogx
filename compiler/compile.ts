/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/


import { Settings, ArgType, CommandError, GenericArgType, CommandDefinition, CommandErrorType, StackElement } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants as replaceCompilerConstants, getJumpLabelUsed, isArgOfType, typeofArg, getLabel, err, addNamespaces, addNamespacesToLine, inForLoop, inNamespace } from "./funcs.js";
import commands from "./commands.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError } from "./classes.js";
import { topForLoop } from "./funcs.js";
import { prependFilenameToArg } from "./funcs.js";

export function compileMlogxToMlog(
	program:string[],
	settings:Settings & {filename: string},
	compilerConstants:{[index: string]: string}
):string[] {

	let [programType, requiredVars, author] = parsePreprocessorDirectives(program);

	let isMain = programType == "main" || settings.compilerOptions.mode == "single";
	
	let outputData:string[] = [];
	let stack:StackElement[] = [];

	for(let requiredVar of requiredVars){
		if(requiredVarCode[requiredVar])
			outputData.push(...requiredVarCode[requiredVar]);
		else
			err("Unknown require " + requiredVar, settings);
	}
	
	for(let line in program){
		try {
			let compiledOutput = compileLine(program[line], compilerConstants, settings, +line, isMain, stack, loopBufferStack);
			if(inForLoop(stack)){
				topForLoop(stack).loopBuffer.push(...compiledOutput);
			} else {
				outputData.push(...compiledOutput);
			}
		} catch(err){
			throw err;
		}
	}

	if(stack.length !== 0){
		err(`Some blocks were not closed.`, settings);
		console.error(stack);
	}

	return outputData;
}

export function compileLine(
	line:string, compilerConstants: {
		[name: string]: string
	}, settings:Settings & {filename:string},
	lineNumber:number,
	isMain:boolean,
	stack:StackElement[]
):string[]{

	
	if(line.includes("\u{F4321}")){
		console.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
	}
	
	let cleanedLine = cleanLine(line);
	if(cleanedLine == ""){
		if(settings.compilerOptions.removeComments){
			return [];
		} else {
			return [line];
		}
	}

	
	cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
	
	if(getLabel(cleanedLine)){
		return inNamespace(stack) ? [`${addNamespaces(getLabel(cleanedLine)!, stack)}:`] : [settings.compilerOptions.removeComments ? cleanedLine : line];
		//TODO fix the way comments are handled
	}

	let args = splitLineIntoArguments(cleanedLine)
		.map(prependFilenameToArg);
	//If an argument starts with __, then prepend __[filename] to avoid name conflicts.

	//if it's a namespace: special handling
	if(args[0] == "namespace"){
		let name:string|undefined = args[1];
		if(!(name?.length > 0)){
			err("No name specified for namespace", settings);
			return [];
		}
		stack.push({
			name,
			type: "namespace"
		});
		return [];
	}

	//if its an &for loop: special handling
	if(args[0] == "&for"){
		if(inForLoop(stack)){
			throw new CompilerError("nested for loops are not yet implemented");
		}
		const variableName = args[1];
		const lowerBound = parseInt(args[2]);
		const upperBound = parseInt(args[3]);
		if(isNaN(lowerBound))
			throw new CompilerError(`Invalid for loop syntax: lowerBound(${lowerBound}) is invalid`);
		if(isNaN(upperBound))
			throw new CompilerError(`Invalid for loop syntax: upperBound(${upperBound}) is invalid`);
		if(lowerBound < 0)
			throw new CompilerError(`Invalid for loop syntax: lowerBound(${upperBound}) cannot be negative`);
		if((upperBound - lowerBound) > 200)
			throw new CompilerError(`Invalid for loop syntax: number of loops(${upperBound - lowerBound}) is greater than 200`);
		stack.push({
			type: "&for",
			lowerBound,
			upperBound,
			variableName,
			loopBuffer: []
		});
		return [];
	}

	//} means a block ended
	if(args[0] == "}"){
		if(stack.length == 0){
			err("No block to end", settings);
		} else {
			const endedBlock = stack.pop();
			if(endedBlock?.type == "&for"){
				let output = [];
				for(let i = endedBlock.lowerBound; i <= endedBlock.upperBound; i ++){
					output.push(
						...endedBlock.loopBuffer.map(line => replaceCompilerConstants(line, {
							[endedBlock.variableName]: i.toString()
						}))
					);
				}
				return output;
			} else if(endedBlock?.type == "namespace"){
				//no special handling needed
			}
		}
		return [];
	}

	//TODO: refactor this code, there are already functions implemented for this
	let commandList = commands[args[0]];
	if(!commandList){
		err(`Unknown command ${args[0]}\nat \`${line}\``, settings);
		return [];
	}

	let errors:CommandError[] = [] as any;
	
	//especially this part needs refactoring its kinda sussy
	for(let command of commandList){
		let result = checkCommand(command, cleanedLine);
		if(result.replace){
			return result.replace.map((line:string) => addNamespacesToLine(splitLineIntoArguments(line), getCommandDefinitions(line)[0], stack));
			//the use of getCommandDefinitions here is sorta wrong
		} else if(result.error){
			errors.push(result.error);
		} else if(result.ok){
			return [addNamespacesToLine(args, command, stack)];
		}
	}

	//this code is *weird*
	if(commandList.length == 1){
		err(errors[0].message, settings);
	} else {
		err(
`Line
\`${cleanedLine}\`
did not match any overloads for command ${args[0]}`
		, settings);
	}

	if(!commandList[0].replace){
		return [settings.compilerOptions.removeComments ? cleanedLine : line + " #Error"];
	} else {
		return [];
	}
}

/**Type checks an mlog program. */
export function checkTypes(compiledProgram:string[], settings:Settings, uncompiledProgram?:string[]){

	let variablesUsed: {
		[name: string]: {
			variableTypes: ArgType[];
			line: string;
		}[]
	} = {};

	let variablesDefined: {
		[name: string]: {
			variableType: ArgType;
			line: string;
		}[]
	} = {
		...processorVariables,
		...(uncompiledProgram ? getParameters(uncompiledProgram).reduce((accumulator:typeof variablesDefined, [name, type]) => {
			accumulator[name] ??= [];
			accumulator[name].push({variableType: type, line: "[function parameter]"})
			return accumulator;
		}, {}) : {})
	};

	let jumpLabelsUsed: {
		[name: string]: {
			line: string;
		}[]
	} = {};
	let jumpLabelsDefined: {
		[name: string]: {
			line: string;
		}[]
	} = {};

	toNextLine:
	for(let line of compiledProgram){
		let cleanedLine = cleanLine(line);
		if(cleanedLine == "") continue toNextLine;


		let labelName = getLabel(cleanedLine);
		if(labelName){
			jumpLabelsDefined[labelName] ??= [];
			jumpLabelsDefined[labelName].push({
				line: line
			});
			continue toNextLine;
		}

		let args = splitLineIntoArguments(line).slice(1);
		let commandDefinitions = getCommandDefinitions(cleanedLine);
		if(commandDefinitions.length == 0){
			throw new CompilerError(
`Type checking aborted because the program contains invalid commands.
	at \`${line}\``
			);
		}

		let jumpLabelUsed:string | null = getJumpLabelUsed(cleanedLine);
		if(jumpLabelUsed){
			jumpLabelsUsed[jumpLabelUsed] ??= [];
			jumpLabelsUsed[jumpLabelUsed].push({
				line: cleanedLine
			});
		}

		for(let commandDefinition of commandDefinitions){
			getVariablesDefined(args, commandDefinition).forEach(([variableName, variableType]) => {
				variablesDefined[variableName] ??= [];
				variablesDefined[variableName].push({
					variableType,
					line: line
				});
			});
		}

		getAllPossibleVariablesUsed(cleanedLine).forEach(([variableName, variableTypes]) => {
			variablesUsed[variableName] ??= [];
			variablesUsed[variableName].push({
				variableTypes,
				line: line
			});
		});


	}

	//Check for conflicting definitions
	for(let [name, variable] of Object.entries(variablesDefined)){
		//Create a list of each definition's type and remove duplicates.
		//If this list has more than one element there are definitions of conflicting types.
		let types = [
			...new Set(variable.map(el => el.variableType))
		].filter(el => 
			el != GenericArgType.valid && el != GenericArgType.any &&
			el != GenericArgType.variable && el != GenericArgType.valid &&
			el != GenericArgType.null
		).map(el => el == "boolean" ? "number" : el);
		//TODO do this properly
		if(types.length > 1){
			console.warn(
`Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
	First definition: \`${variable[0].line}\`
	First conflicting definition: \`${variable.filter(v => v.variableType == types[1])[0].line}\``);
			
		}
	};

	
	//Check for variable usage of wrong type
	for(let [name, variableUsages] of Object.entries(variablesUsed)){
		if(name == "_") continue;
		for(let variableUsage of variableUsages){
			//If the list of possible types does not include the type of the first definition
			if(!variablesDefined[name]){
				console.warn(
`Variable "${name}" seems to be undefined.
	at ${variableUsage.line}`);
			} else if(!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variablesDefined[name][0].variableType)){
				console.warn(
`Type mismatch: variable "${name}" is of type "${variablesDefined[name][0].variableType}",\
but the command requires it to be of type [${variableUsage.variableTypes.map(t => `"${t}"`).join(", ")}]
	at ${variableUsage.line}
	First definition at: ${variablesDefined[name][0].line}`);
			}
		}
	}

	//Check for redefined jump labels
	for(let [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)){
		if(definitions.length > 1){
			console.warn(`Jump label ${jumpLabel} was defined ${definitions.length} times.`);
		}
	}

	//Check for undefined jump labels
	for(let [jumpLabel, definitions] of Object.entries(jumpLabelsUsed)){
		if(!jumpLabelsDefined[jumpLabel]){
			console.warn(
`Jump label ${jumpLabel} is missing.
	at ${definitions[0].line}`
			)
		}
	}

	

}

/**Checks if a command is valid for a command definition.*/
export function checkCommand(command:CommandDefinition, line:string): {
	ok: boolean
	replace?: string[],
	error?: CommandError
} {
	let args = splitLineIntoArguments(line);
	let commandArguments = args.slice(1);
	if(commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.isOptional).length){
		return {
			ok: false,
			error: {
				type: CommandErrorType.argumentCount,
				message:
`Incorrect number of arguments for command "${args[0]}"
	at \`${line}\`
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
			}
		};
	}

	for(let arg in commandArguments){
		if(!isArgOfType(commandArguments[+arg], command.args[+arg])){
			return {
				ok: false,
				error: {
					type: CommandErrorType.type,
					message:
`Type mismatch: value "${commandArguments[+arg]}" was expected to be of type "${command.args[+arg].isVariable ? "variable" : command.args[+arg].type}", but was of type "${typeofArg(commandArguments[+arg])}"
	at \`${line}\``
				}
			};
		}
		
	}



	if(command.replace){
		return {
			ok: true,
			replace: command.replace(args),
		};
	}

	return {
		ok: true
	};
}
