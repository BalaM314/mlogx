/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 

Contains pure-ish functions related to compiling.
*/


import {
	Settings, GAT, CommandDefinition, CommandErrorType, StackElement, Line, TData, TypeCheckingData, CompiledLine, CompilerConsts
} from "./types.js";
import {
	cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined,
	parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType,
	getParameters, replaceCompilerConstants, getJumpLabelUsed, getJumpLabel,
	addNamespacesToVariable, addNamespacesToLine, hasElement, topForLoop,
	prependFilenameToArg, getCommandDefinition, formatLineWithPrefix, removeUnusedJumps,
	addSourcesToCode, transformCommand, range, hasDisabledIf, 
} from "./funcs.js";
import { maxLines, processorVariables, requiredVarCode } from "./consts.js";
import { Arg, CompilerError, Log } from "./classes.js";
import commands from "./commands.js";

export function compileMlogxToMlog(
	mlogxProgram:string[],
	settings:Settings,
	compilerConstants: CompilerConsts
):string[] {

	const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);

	const isMain = programType == "main" || settings.compilerOptions.mode == "single";
	
	const compiledProgram:string[] = [];
	let stack:StackElement[] = [];

	/** Warning: mutated in a function. */
	// eslint-disable-next-line prefer-const
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

	//Add required vars
	for(const requiredVar of requiredVars){
		if(requiredVarCode[requiredVar]){
			compiledProgram.push(...requiredVarCode[requiredVar][0]);
			typeCheckingData.variableDefinitions[requiredVar] = [{
				variableType: requiredVarCode[requiredVar][1],
				line: {
					text: `[required variable]`,
					lineNumber: 0
				}
			}];
		} else {
			Log.warn("Unknown require " + requiredVar);
		}
	}


	let hasInvalidStatements = false;
	//Loop through each line and compile it
	for(const line in mlogxProgram){
		const sourceLine = {
			lineNumber: +line+1,
			text: mlogxProgram[line]
		};
		try {
			const { compiledCode, modifiedStack, skipTypeChecks } = compileLine(sourceLine, compilerConstants, settings, isMain, stack);
			if(modifiedStack) stack = modifiedStack; //ew mutable data
			if(hasDisabledIf(stack)){
				continue;
			}
			if(!hasInvalidStatements && !skipTypeChecks && !hasElement(stack, "&for")){
				try {
					for(const compiledLine of compiledCode){
						typeCheckLine(compiledLine, typeCheckingData);
					}
				} catch(err){
					if(err instanceof CompilerError){
						Log.err(
`${err.message}
${formatLineWithPrefix(sourceLine, settings)}`
						);
						hasInvalidStatements = true;
					} else {
						throw err;
					}
				}
			}
			if(hasElement(stack, "&for")){
				topForLoop(stack)?.loopBuffer.push(...compiledCode);
			} else {
				compiledProgram.push(...compiledCode.map(line => line[0]));
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
		for(const element of stack){
			Log.err(
`${element.type == "namespace" ? `Namespace "${element.name}"` : element.type == "&for" ? `For loop with variable "${element.variableName}"` : `&if statement`} was not closed.
${formatLineWithPrefix(element.line, settings)}`
			);
		}
		throw new CompilerError("There were unclosed blocks.");
	}

	
	if(settings.compilerOptions.checkTypes && !hasInvalidStatements)
		printTypeErrors(typeCheckingData, settings);
	
	const outputProgram = 
		settings.compilerOptions.removeUnusedJumpLabels ?
			removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed) :
			compiledProgram;

	if(outputProgram.length > maxLines){
		Log.err(`Program length exceeded 999 lines. Copy-pasting into an ingame processor will fail.`);
	}

	return outputProgram;
	
}

export function typeCheckLine(compiledLine:CompiledLine, typeCheckingData:TypeCheckingData){
	
	const cleanedCompiledLine = cleanLine(compiledLine[0]);
	const cleanedUncompiledLine = cleanLine(compiledLine[1].text);
	if(cleanedCompiledLine == "") return;


	const labelName = getJumpLabel(cleanedCompiledLine);
	if(labelName){
		typeCheckingData.jumpLabelsDefined[labelName] ??= [];
		typeCheckingData.jumpLabelsDefined[labelName].push({
			line: compiledLine[1]
		});
		return;
	}

	const compiledCommandArgs = splitLineIntoArguments(cleanedCompiledLine).slice(1);
	const compiledCommandDefinitions = getCommandDefinitions(cleanedCompiledLine);
	const uncompiledCommandArgs = splitLineIntoArguments(cleanedUncompiledLine).slice(1);
	const uncompiledCommandDefinitions = getCommandDefinitions(cleanedUncompiledLine);
	if(compiledCommandDefinitions.length == 0){
		throw new CompilerError(
`Type checking aborted because the program contains invalid commands.`
		);
	}
	if(uncompiledCommandDefinitions.length == 0){
		Log.warn("Tried to type check a line with an invalid uncompiled command definition. This has most likely occured as the result of a bodge. This may cause issues with type checking.");
	}

	const jumpLabelUsed:string | null = getJumpLabelUsed(cleanedCompiledLine);
	if(jumpLabelUsed){
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed] ??= [];
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed].push({
			line: compiledLine[1]
		});
	}

	for(const commandDefinition of compiledCommandDefinitions){
		getVariablesDefined(compiledCommandArgs, commandDefinition, uncompiledCommandArgs, uncompiledCommandDefinitions[0]).forEach(([variableName, variableType]) => {
			typeCheckingData.variableDefinitions[variableName] ??= [];
			typeCheckingData.variableDefinitions[variableName].push({
				variableType,
				line: compiledLine[1]
			});
		});
	}

	getAllPossibleVariablesUsed(cleanedCompiledLine, compiledLine[1].text).forEach(([variableName, variableTypes]) => {
		typeCheckingData.variableUsages[variableName] ??= [];
		typeCheckingData.variableUsages[variableName].push({
			variableTypes,
			line: compiledLine[1]
		});
	});

	return;
}

export function printTypeErrors({variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed}: TypeCheckingData, settings:Settings){
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
	line:Line, compilerConstants: CompilerConsts,
	settings:Settings,
	isMain:boolean,
	stack:StackElement[]
): {
	compiledCode:CompiledLine[];
	modifiedStack?:StackElement[];
	skipTypeChecks?:boolean;
} {

	
	if(line.text.includes("\u{F4321}")){
		Log.warn(`Line \`${line.text}\` includes the character \\uF4321 which may cause issues with argument parsing`);
	}
	
	let cleanedLine = cleanLine(line.text);
	if(cleanedLine == ""){
		if(settings.compilerOptions.removeComments){
			return {
				compiledCode: []
			};
		} else {
			return {
				compiledCode: [[line.text, line]]
			};
		}
	}

	
	cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
	
	if(getJumpLabel(cleanedLine)){
		return {
			compiledCode: [
				[
					hasElement(stack, "namespace") ? 
						`${addNamespacesToVariable(getJumpLabel(cleanedLine)!, stack)}:` :
						settings.compilerOptions.removeComments ? cleanedLine : line.text,
					line
				] as CompiledLine
			]
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
				type: "namespace",
				line
			}),
			compiledCode: []
		};
	}

	//if its an &for loop: special handling
	if(args[0] == "&for"){
		if(args.at(-1) != "{"){
			throw new CompilerError("expected { at end of &for statement");
		}
		const variableName = args[1];
		const type = args[2];
		if(type == "of"){
			return {
				modifiedStack: stack.concat({
					type: "&for",
					elements: args.slice(3, -1),
					variableName,
					loopBuffer: [],
					line
				}),
				compiledCode: []
			};
		} else if(type == "in"){
			const lowerBound = parseInt(args[3]);
			const upperBound = parseInt(args[4]);
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
					elements: range(lowerBound, upperBound, true),
					variableName,
					loopBuffer: [],
					line
				}),
				compiledCode: []
			};
		} else {
			const lowerBound = parseInt(args[2]);
			const upperBound = parseInt(args[3]);
			Log.warn(`"&for ${variableName} ${lowerBound} ${upperBound}" syntax is deprecated, please use "&for ${variableName} in ${lowerBound} ${upperBound}" instead.`);
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
					elements: range(lowerBound, upperBound, true),
					variableName,
					loopBuffer: [],
					line
				}),
				compiledCode: []
			};
		}
	}

	if(args[0] == "&if"){
		let isEnabled = false;
		if(args.length == 3){
			if(!isNaN(parseInt(args[1]))){
				isEnabled = !! parseInt(args[1]);
			} else if(args[1] == "true"){
				isEnabled = true;
			} else if(args[1] == "false"){
				isEnabled = false;
			} else {
				Log.warn(`condition in &if statement(${args[1]}) is not true or false.`);
				isEnabled = true;
			}
		}

		return {
			modifiedStack: stack.concat({
				type: "&if",
				line,
				enabled: isEnabled
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
				const compiledCode:CompiledLine[] = [];
				for(const el of endedBlock.elements){
					compiledCode.push(
						...endedBlock.loopBuffer.map(line => [replaceCompilerConstants(line[0], new Map([[endedBlock.variableName, el]])), {
							text: replaceCompilerConstants(line[1].text, new Map([
								...compilerConstants.entries(),
								[endedBlock.variableName, el]
							])),
							lineNumber: line[1].lineNumber
						}] as CompiledLine)
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
			throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line.text}"\nPlease copy this and file an issue on Github.`);
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
		compiledCode: addSourcesToCode(getOutputForCommand(args, commandList[0], stack), line)
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

/**Adds jump labels to vanilla MLOG code that uses jump indexes. */
export function addJumpLabels(code:string[]):string[] {
	let lastJumpNameIndex = 0;
	const jumps: {
		[index: string]: string;
	} = {};
	const transformedCode:string[] = [];
	const outputCode:string[] = [];

	const cleanedCode = code.map(line => cleanLine(line)).filter(line => line);

	//Identify all jump addresses
	for(const line of cleanedCode){
		const label = getJumpLabelUsed(line);
		if(label){
			if(label == "0"){
				jumps[label] = "0";
			} else if(!isNaN(parseInt(label))){
				jumps[label] = `jump_${lastJumpNameIndex}_`;
				lastJumpNameIndex += 1;
			}
		}
	}

	//Replace jump addresses with jump labels
	for(const line of cleanedCode){
		if(getCommandDefinition(line) == commands.jump[0]){
			const label = getJumpLabelUsed(line);
			if(label == undefined) throw new Error("invalid jump statement");
			transformedCode.push(
				transformCommand(
					splitLineIntoArguments(line),
					commands.jump[0],
					//Replace arguments
					(arg:string) => jumps[arg] ?? (() => {throw new Error(`Unknown jump label ${arg}`);})(),
					//But only if the argument is a jump address
					(arg:string, carg:Arg) => carg.isGeneric && carg.type == GAT.jumpAddress
				).join(" ")
			);
		} else {
			transformedCode.push(line);
		}
	}

	//Add jump labels
	for(const lineNumber in transformedCode){
		const jumpLabel = jumps[(+lineNumber).toString()];
		if(jumpLabel){
			outputCode.push(`${jumpLabel}: #AUTOGENERATED`);
		}
		outputCode.push(transformedCode[lineNumber]);
	}

	return outputCode;

}
