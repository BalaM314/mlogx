/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/


import { Settings, ArgType, CommandError, GenericArgType } from "./types.js";
import { checkCommand, cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, typesAreCompatible, getParameters, replaceCompilerVariables, getJumpLabelUsed } from "./funcs.js";
import commands from "./commands.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError } from "./classes.js";


export function compileMlogxToMlog(
	program:string[],
	settings:Settings & {filename: string},
	compilerVariables:{[index: string]: string}
):string[] {

	let [programType, requiredVars, author] = parsePreprocessorDirectives(program);

	let isMain = programType == "main" || settings.compilerOptions.mode == "single";

	function err(message:string){
		if(settings.compilerOptions.compileWithErrors){
			console.warn("Error: " + message);
		} else {
			throw new CompilerError(message);
		}
	}
	
	let outputData:string[] = [];

	for(let requiredVar of requiredVars){
		if(requiredVarCode[requiredVar])
			outputData.push(...requiredVarCode[requiredVar]);
		else
			err("Unknown require " + requiredVar);
	}
	
	//OMG I USED A JS LABEL
	toNextLine:
	for(let line of program){

		line = replaceCompilerVariables(line, compilerVariables);

		if(line.includes("\u{F4321}")){
			console.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
		}

		let cleanedLine = cleanLine(line);

		if(cleanedLine == ""){
			if(!settings.compilerOptions.removeComments){
				outputData.push(line);
			}
			continue toNextLine;
		}

		if(cleanedLine.match(/[^ ]+:$/)){
			//line is a label, don't touch it
			outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line);
			continue toNextLine;
		}

		let args = splitLineIntoArguments(cleanedLine)
			.map(arg => arg.startsWith("__") ? `${isMain ? "" : settings.filename.replace(/\.mlogx?/gi, "")}${arg}` : arg);
		//If an argument starts with __, then prepend __[filename] to avoid name conflicts.

		let commandList = commands[args[0].toLowerCase()];
		if(!commandList){
			err(`Unknown command ${args[0]}\nat \`${line}\``);
			continue toNextLine;
		}

		let error:CommandError = {} as any;
		
		for(let command of commandList){
			let result = checkCommand(command, cleanedLine);
			if(result.replace){
				outputData.push(...result.replace);
				continue toNextLine;
			} else if(result.error){
				error = result.error;
			} else if(result.ok){
				outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line);
				continue toNextLine;
			}
		}
		if(commandList.length == 1){
			err(error.message);
		} else {
			err(
	`Line
	\`${line}\`
	did not match any overloads for command ${args[0]}`
			);
		}

		if(!commandList[0].replace){
			outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line + " #Error");
		}

	}

	return outputData;
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


		let labelName = cleanedLine.match(/^.+?(?=\:$)/i)?.[0];
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
		let types = [...new Set(variable.map(el => el.variableType))].filter(el => el != GenericArgType.valid && el != GenericArgType.any && el != GenericArgType.variable && el != GenericArgType.valid);
		//Todo fix this ^^ it isn't good enough.

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
