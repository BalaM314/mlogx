/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/


import { Settings, GAT, CommandDefinition, CommandErrorType, StackElement, Line, TData, TypeCheckingData } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants, getJumpLabelUsed, getLabel, addNamespaces, addNamespacesToLine, inForLoop, inNamespace, topForLoop, prependFilenameToArg, getCommandDefinition, formatLineWithPrefix,  } from "./funcs.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError, Log } from "./classes.js";
import deepmerge from "deepmerge";

export function compileMlogxToMlog(
	mlogxProgram:string[],
	settings:Settings & {filename: string},
	compilerConstants:{[index: string]: string}
):string[] {

	const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);

	const isMain = programType == "main" || settings.compilerOptions.mode == "single";
	
	const compiledProgram:string[] = [];
	let stack:StackElement[] = [];

	let typeCheckingData:TypeCheckingData = {
		jumpLabelsDefined: {},
		jumpLabelsUsed: {},
		variableDefinitions: {
			...processorVariables,
			...(mlogxProgram ? getParameters(mlogxProgram).reduce((accumulator:TData.variableDefinitions, [name, type]) => {
				accumulator[name] ??= [];
				accumulator[name].push({variableType: type, line: {
					text: "[function parameter]",
					lineNumber: 1
				}});
				return accumulator;
			}, {}) : {})
		},
		variableUsages: {}
	};



	for(const requiredVar of requiredVars){
		if(requiredVarCode[requiredVar])
			compiledProgram.push(...requiredVarCode[requiredVar]);
		else
			Log.warn("Unknown require " + requiredVar);
	}
	
	//Loop through each line and compile it
	for(const line in mlogxProgram){
		try {
			const { compiledCode, modifiedStack } = compileLine(mlogxProgram[line], compilerConstants, settings, +line, isMain, stack);
			if(modifiedStack) stack = modifiedStack;
			for(const compiledLine of compiledCode){
				const newTypeData = typeCheckLine(compiledLine, {
					text: mlogxProgram[line],
					lineNumber: +line + 1
				});
				typeCheckingData = deepmerge(typeCheckingData, newTypeData);
			}
			if(inForLoop(stack)){
				topForLoop(stack)?.loopBuffer.push(...compiledCode);
			} else {
				compiledProgram.push(...compiledCode);
			}
		} catch(err){
			if(err instanceof CompilerError){
				Log.err(
`${err.message}
${formatLineWithPrefix({
	lineNumber:+line+1, text:mlogxProgram[line]
}, settings)}`
				);
			} else {
				throw err;
			}
		}
	}

	//Check for unclosed blocks
	if(stack.length !== 0){
		Log.err(`Some blocks were not closed.`);
		Log.dump(stack);
		//TODO better
	}

	printTypeErrors(typeCheckingData, settings);

	return compiledProgram;
}

export function typeCheckLine(compiledCode:string, uncompiledLine:Line):TypeCheckingData {
	const outputData:TypeCheckingData = {
		jumpLabelsDefined: {},
		jumpLabelsUsed: {},
		variableDefinitions: {},
		variableUsages: {}
	};
	const cleanedLine = cleanLine(compiledCode);
	if(cleanedLine == "") return outputData;


	const labelName = getLabel(cleanedLine);
	if(labelName){
		outputData.jumpLabelsDefined[labelName] ??= [];
		outputData.jumpLabelsDefined[labelName].push({
			line: uncompiledLine
		});
		return outputData;
	}

	const args = splitLineIntoArguments(cleanedLine).slice(1);
	const commandDefinitions = getCommandDefinitions(cleanedLine);
	if(commandDefinitions.length == 0){
		throw new CompilerError(
`Type checking aborted because the program contains invalid commands.`
		);
	}

	const jumpLabelUsed:string | null = getJumpLabelUsed(cleanedLine);
	if(jumpLabelUsed){
		outputData.jumpLabelsUsed[jumpLabelUsed] ??= [];
		outputData.jumpLabelsUsed[jumpLabelUsed].push({
			line: uncompiledLine
		});
	}

	for(const commandDefinition of commandDefinitions){
		getVariablesDefined(args, commandDefinition).forEach(([variableName, variableType]) => {
			outputData.variableDefinitions[variableName] ??= [];
			outputData.variableDefinitions[variableName].push({
				variableType,
				line: uncompiledLine
			});
		});
	}

	getAllPossibleVariablesUsed(cleanedLine).forEach(([variableName, variableTypes]) => {
		outputData.variableUsages[variableName] ??= [];
		outputData.variableUsages[variableName].push({
			variableTypes,
			line: uncompiledLine
		});
	});

	return outputData;
}

export function printTypeErrors({variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed}: TypeCheckingData, settings:Settings & {filename: string}){
	//Check for conflicting definitions
	for(const [name, definitions] of Object.entries(variableDefinitions)){
		//Create a list of each definition's type and remove duplicates.
		//If this list has more than one element there are definitions of conflicting types.
		const types = [
			...new Set(definitions.map(el => el.variableType))
		].filter(el => 
			el != GAT.valid && el != GAT.any &&
			el != GAT.variable && el != GAT.valid &&
			el != GAT.null
		).map(el => el == "boolean" ? "number" : el);
		//TODO do this properly
		if(types.length > 1){
			Log.warn(
`Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
	First definition:
${formatLineWithPrefix(definitions[0].line, settings, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(definitions.filter(v => v.variableType == types[1])[0].line, settings, "\t\t")}`
			);
		}
	}

	
	//Check for variable usage of wrong type
	for(const [name, thisVariableUsages] of Object.entries(variableUsages)){
		if(name == "_") continue;
		for(const variableUsage of thisVariableUsages){
			if(!(name in variableDefinitions)){
				//If the variable has never been defined
				Log.warn(
`Variable "${name}" seems to be undefined.
${formatLineWithPrefix(variableUsage.line, settings)}`
				);
			} else if(!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variableDefinitions[name][0].variableType)){
				//If the list of possible types does not include the type of the first definition
				Log.warn(
`Variable "${name}" is of type "${variableDefinitions[name][0].variableType}", \
but the command requires it to be of type ${variableUsage.variableTypes.map(t => `"${t}"`).join(" or ")}
${formatLineWithPrefix(variableUsage.line, settings)}
	First definition: 
${formatLineWithPrefix(variableDefinitions[name][0].line, settings, "\t\t")}`
				);
			}
		}
	}

	//Check for redefined jump labels
	for(const [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)){
		if(definitions.length > 1){
			Log.warn(`Jump label "${jumpLabel}" was defined ${definitions.length} times.`);
			definitions.forEach(definition => 
				Log.none(
					formatLineWithPrefix(definition.line, settings)
				)
			);
		}
	}

	//Check for undefined jump labels
	for(const [jumpLabel, usages] of Object.entries(jumpLabelsUsed)){
		if(!jumpLabelsDefined[jumpLabel]){
			Log.warn(`Jump label "${jumpLabel}" is missing.`);
			usages.forEach(usage => 
				Log.none(
					formatLineWithPrefix(usage.line, settings)
				)
			);
		}
	}
}

export function compileLine(
	line:string, compilerConstants: {
		[name: string]: string
	}, settings:Settings & {filename:string},
	lineNumber:number,
	isMain:boolean,
	stack:StackElement[]
): {
	compiledCode:string[];
	modifiedStack?:StackElement[];
} {

	
	if(line.includes("\u{F4321}")){
		Log.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
	}
	
	let cleanedLine = cleanLine(line);
	if(cleanedLine == ""){
		if(settings.compilerOptions.removeComments){
			return {
				compiledCode: []
			};
		} else {
			return {
				compiledCode: [line]
			};
		}
	}

	
	cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
	
	if(getLabel(cleanedLine)){
		return {
			compiledCode: inNamespace(stack) ? 
				[`${addNamespaces(getLabel(cleanedLine)!, stack)}:`] :
				[settings.compilerOptions.removeComments ? cleanedLine : line]
		};
		//TODO fix the way comments are handled
	}

	const args = splitLineIntoArguments(cleanedLine)
		.map(arg => prependFilenameToArg(arg, isMain, settings.filename));
	//If an argument starts with __, then prepend __[filename] to avoid name conflicts.

	//if it's a namespace: special handling
	if(args[0] == "namespace"){
		const name:string|undefined = args[1];
		if(!(name?.length > 0)){
			throw new CompilerError("No name specified for namespace");
		}
		return {
			modifiedStack: stack.concat({
				name,
				type: "namespace"
			}),
			compiledCode: []
		};
	}

	//if its an &for loop: special handling
	if(args[0] == "&for"){
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
		return {
			modifiedStack: stack.concat({
				type: "&for",
				lowerBound,
				upperBound,
				variableName,
				loopBuffer: []
			}),
			compiledCode: []
		};
	}

	//} means a block ended
	if(args[0] == "}"){
		if(stack.length == 0){
			throw new CompilerError("No block to end");
		} else {
			const modifiedStack = stack.slice();
			const endedBlock = modifiedStack.pop();
			if(endedBlock?.type == "&for"){
				const compiledCode = [];
				for(let i = endedBlock.lowerBound; i <= endedBlock.upperBound; i ++){
					compiledCode.push(
						...endedBlock.loopBuffer.map(line => replaceCompilerConstants(line, {
							[endedBlock.variableName]: i.toString()
						}))
					);
				}
				return {
					compiledCode,
					modifiedStack
				};
			} else if(endedBlock?.type == "namespace"){
				//no special handling needed
			}
			return {
				modifiedStack,
				compiledCode: []
			};
		}
	}

	const [ commandList, errors ] = getCommandDefinitions(cleanedLine, true);

	if(commandList.length == 0){
		//No commands were valid
		if(errors.length == 0){
			throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line}"\nPlease copy this and file an issue on Github.`);
		}
		if(errors.length == 1){
			throw new CompilerError(errors[0].message);
		} else {

			//Find the right error message
			const typeErrors = errors.filter(error => error.type == CommandErrorType.type);
			if(settings.compilerOptions.verbose){
				throw new CompilerError(`Line did not match any overloads for command ${args[0]}:\n` + errors.map(err => "\t" + err.message).join("\n"));
			} else {
				if(typeErrors.length != 0){
					//one of the errors was a type error
					throw new CompilerError(typeErrors[0].message + `\nErrors for other overloads not displayed.`);
				} else {
					//Otherwise there's nothing that can be done and we have to say "no overloads matched"
					throw new CompilerError(`Line did not match any overloads for command ${args[0]}`);
				}
			}
		}
	}
	//Otherwise, the command was valid, so output
	return {
		compiledCode: getOutputForCommand(args, commandList[0], stack)
	};

}

/**Gets the compiled output for a command given a command definition and the stack. */
export function getOutputForCommand(args:string[], command:CommandDefinition, stack:StackElement[]):string[] {
	if(command.replace){
		const compiledCommand = command.replace(args);
		return compiledCommand.map(line => {
			const compiledCommandDefinition = getCommandDefinition(line);
			if(!compiledCommandDefinition){
				Log.dump({args, command, compiledCommand, compiledCommandDefinition});
				throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
			}
			return addNamespacesToLine(splitLineIntoArguments(line), compiledCommandDefinition, stack);
		});
	}
	return [ addNamespacesToLine(args, command, stack) ];
}