/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains pure-ish functions related to compiling.
*/


import deepmerge from "deepmerge";
import { Arg } from "./args.js";
import { CompilerError } from "./classes.js";
import { CommandDefinition, commands, CompilerCommandDefinition } from "./commands.js";
import { maxLines, processorVariables, requiredVarCode } from "./consts.js";
import {
	addNamespacesToLine, addNamespacesToVariable, addSourcesToCode, areAnyOfInputsCompatibleWithType,
	cleanLine, formatLineWithPrefix, getAllPossibleVariablesUsed, getCommandDefinition,
	getCommandDefinitions, getCompilerCommandDefinitions, getJumpLabel, getJumpLabelUsed,
	getParameters, getVariablesDefined, impossible, parsePreprocessorDirectives, prependFilenameToArg,
	removeUnusedJumps, replaceCompilerConstants, splitLineIntoArguments, transformCommand
} from "./funcs.js";
import { Log } from "./Log.js";
import { Settings } from "./settings.js";
import { hasElement, StackElement } from "./stack_elements.js";
import {
	CommandErrorType, CompiledLine, CompilerConsts, Line, PortingMode, TData, TypeCheckingData
} from "./types.js";

export function compileMlogxToMlog(
	mlogxProgram:string[],
	settings:Settings,
	compilerConsts:CompilerConsts,
	typeDefinitions:TypeCheckingData = {
		jumpLabelsDefined: {},
		jumpLabelsUsed: {},
		variableDefinitions: {},
		variableUsages: {},
	},
):{outputProgram:CompiledLine[], typeCheckingData:TypeCheckingData} {



	const cleanedProgram = cleanProgram(mlogxProgram, settings);
	const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);
	const isMain = programType == "main" || settings.compilerOptions.mode == "single";
	const compiledProgram:CompiledLine[] = [];
	let stack:StackElement[] = [];
	let pseudoStack:string[] = [];
	/** Warning: mutated in a function. */
	// eslint-disable-next-line prefer-const
	let typeCheckingData:TypeCheckingData = deepmerge<TypeCheckingData>(typeDefinitions, {
		variableDefinitions: {
			...processorVariables,
			...(mlogxProgram ? getParameters(mlogxProgram).reduce((accumulator:TData.variableDefinitions, [name, type]) => {
				accumulator[name] ??= [];
				accumulator[name].push({variableType: type, line: {
					text: "[function parameter]",
					lineNumber: 1,
					sourceFilename: "[function parameter]"
				}});
				return accumulator;
			},{}) : {})
		}
	});

	//Add required vars
	for(const requiredVar of requiredVars){
		if(requiredVarCode[requiredVar]){
			compiledProgram.push(...requiredVarCode[requiredVar][0].map(line => [line, {
				text: `[#require'd variable]`,
				lineNumber: 0,
				sourceFilename: "[#require'd variable]",
			}, {
				text: `[#require'd variable]`,
				lineNumber: 0,
				sourceFilename: "[#require'd variable]",
			}] as CompiledLine));
			typeCheckingData.variableDefinitions[requiredVar] = [{
				variableType: requiredVarCode[requiredVar][1],
				line: {
					text: `[#require'd variable]`,
					lineNumber: 0,
					sourceFilename: "[#require'd variable]",
				}
			}];
		} else {
			Log.printMessage("unknown require", {requiredVar});
		}
	}


	let hasInvalidStatements = false;
	//Loop through each line and compile it
	toNextLine:
	for(const line of cleanedProgram){
		try {

			let modifiedLine = line[0];
			if(line[0].text != "}"){
				for(const def of stack.map(el => el.commandDefinition).reverse()){
					if(def.onprecompile){
						const output = def.onprecompile({compilerConsts, line: modifiedLine, settings, stack});
						if("skipCompilation" in output) continue toNextLine;
						modifiedLine = output.output;
					}
				}
			}

			const { compiledCode, modifiedStack, skipTypeChecks, typeCheckingData: outputTypeCheckingData } = compileLine([modifiedLine, line[1]], compilerConsts, settings, isMain, stack);
			if(modifiedStack) stack = modifiedStack; //ew mutable data

			//Handle onpostcompile
			let doTypeChecks = !skipTypeChecks;
			let modifiedCode = compiledCode;
			for(const def of stack.map(el => el.commandDefinition).reverse()){
				if(def.onpostcompile){
					const { modifiedOutput, skipTypeChecks } = def.onpostcompile({compiledOutput: compiledCode, compilerConsts, settings, stack});
					if(skipTypeChecks) doTypeChecks = false;
					modifiedCode = modifiedOutput;
				}
			}

			//Do type checks
			if(doTypeChecks){
				try {
					for(const compiledLine of modifiedCode){
						typeCheckLine(compiledLine, typeCheckingData);
					}
				} catch(err){
					if(err instanceof CompilerError){
						Log.err(
`${err.message}
${formatLineWithPrefix(line[1])}`
						);
						hasInvalidStatements = true;
					} else {
						throw err;
					}
				}
			}

			compiledProgram.push(...modifiedCode);
			if(outputTypeCheckingData) typeCheckingData = deepmerge(typeCheckingData, outputTypeCheckingData);
		} catch(err){
			if(err instanceof CompilerError){
				Log.err(
`${err.message}
${formatLineWithPrefix(line[1])}`
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
${formatLineWithPrefix(element.line)}`
			);
		}
		throw new CompilerError("There were unclosed blocks.");
	}

	
	if(settings.compilerOptions.checkTypes && !hasInvalidStatements)
		printTypeErrors(typeCheckingData);
	
	const outputProgram =
		settings.compilerOptions.removeUnusedJumpLabels ?
			removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed) :
			compiledProgram;

	if(outputProgram.length > maxLines){
		Log.printMessage("program too long", {});
	}

	return {outputProgram, typeCheckingData};
	
}

export function cleanProgram(program:string[], settings:Settings){
	const outputProgram:[cleanedLine:Line, sourceLine:Line][] = [];
	for(const line in program){
		const sourceLine:Line = {
			lineNumber: +line+1,
			text: program[line],
			sourceFilename: settings.filename
		};
		const cleanedText = cleanLine(sourceLine.text);
		if(cleanedText != "") outputProgram.push([{
			...sourceLine,
			text: cleanedText
		}, sourceLine]);
	}
	return outputProgram;
}

export function typeCheckLine(compiledLine:CompiledLine, typeCheckingData:TypeCheckingData){
	
	const compiledText = compiledLine[0];
	const uncompiledText = compiledLine[2].text;
	const sourceLine = compiledLine[1];
	if(compiledText == "") return;


	const labelName = getJumpLabel(compiledText);
	if(labelName){
		typeCheckingData.jumpLabelsDefined[labelName] ??= [];
		typeCheckingData.jumpLabelsDefined[labelName].push({
			line: sourceLine
		});
		return;
	}

	const compiledCommandArgs = splitLineIntoArguments(compiledText).slice(1);
	const compiledCommandDefinitions = getCommandDefinitions(compiledText);
	const uncompiledCommandArgs = splitLineIntoArguments(uncompiledText).slice(1);
	const uncompiledCommandDefinitions = getCommandDefinitions(uncompiledText);
	if(compiledCommandDefinitions.length == 0){
		throw new CompilerError(
`Type checking aborted because the program contains invalid commands.`
		);
	}
	if(uncompiledCommandDefinitions.length == 0){
		Log.printMessage("invalid uncompiled command definition", {line: compiledLine});
	}

	const jumpLabelUsed:string | null = getJumpLabelUsed(compiledText);
	if(jumpLabelUsed){
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed] ??= [];
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed].push({
			line: sourceLine
		});
	}

	for(const commandDefinition of compiledCommandDefinitions){
		getVariablesDefined(compiledCommandArgs, commandDefinition, uncompiledCommandArgs, uncompiledCommandDefinitions[0]).forEach(([variableName, variableType]) => {
			typeCheckingData.variableDefinitions[variableName] ??= [];
			typeCheckingData.variableDefinitions[variableName].push({
				variableType,
				line: sourceLine
			});
		});
	}

	getAllPossibleVariablesUsed(compiledText, compiledLine[1].text).forEach(([variableName, variableTypes]) => {
		typeCheckingData.variableUsages[variableName] ??= [];
		typeCheckingData.variableUsages[variableName].push({
			variableTypes,
			line: sourceLine
		});
	});

	return;
}

export function printTypeErrors({variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed}: TypeCheckingData){
	//Check for conflicting definitions
	for(const [name, definitions] of Object.entries(variableDefinitions)){
		//Create a list of each definition's type and remove duplicates.
		//If this list has more than one element there are definitions of conflicting types.
		const types = [
			...new Set(
				definitions.map(el => el.variableType)
					.filter(el =>
						el != "any" && el != "variable" &&
						el != "null"
					).map(el => el == "boolean" ? "number" : el)
			)
		];
		//TODO do this properly
		if(types.length > 1){
			Log.printMessage("variable redefined with conflicting type", {
				name, types, firstDefinitionLine: definitions.filter(d => d.variableType == types[0])[0].line, conflictingDefinitionLine: definitions.filter(v => v.variableType == types[1])[0].line
			});
		}
	}

	
	//Check for variable usage of wrong type
	for(const [name, thisVariableUsages] of Object.entries(variableUsages)){
		if(name == "_") continue;
		for(const variableUsage of thisVariableUsages){
			if(!(name in variableDefinitions)){
				//If the variable has never been defined
				Log.printMessage("variable undefined", {
					name, line: variableUsage.line
				});
			} else if(!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variableDefinitions[name][0].variableType)){
				//If the list of possible types does not include the type of the first definition
				Log.warn(
`Variable "${name}" is of type "${variableDefinitions[name][0].variableType}", \
but the command requires it to be of type ${variableUsage.variableTypes.map(t => `"${t}"`).join(" or ")}
${formatLineWithPrefix(variableUsage.line)}
	First definition:
${formatLineWithPrefix(variableDefinitions[name][0].line, "\t\t")}`
				);
			}
		}
	}

	//Check for redefined jump labels
	for(const [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)){
		if(definitions.length > 1){
			Log.printMessage("jump label redefined", {jumpLabel, numDefinitions:definitions.length});
			definitions.forEach(definition => Log.none(formatLineWithPrefix(definition.line)));
		}
	}

	//Check for undefined jump labels
	for(const [jumpLabel, usages] of Object.entries(jumpLabelsUsed)){
		if(!jumpLabelsDefined[jumpLabel] && isNaN(parseInt(jumpLabel))){
			Log.printMessage("jump label missing", {jumpLabel});
			usages.forEach(usage => Log.none(formatLineWithPrefix(usage.line)));
		}
	}
}

export function compileLine(
	line:[cleanedLine:Line, sourceLine:Line], compilerConsts: CompilerConsts,
	settings:Settings,
	isMain:boolean,
	stack:StackElement[]
): {
	compiledCode:CompiledLine[];
	modifiedStack?:StackElement[];
	skipTypeChecks?:boolean;
	typeCheckingData?:TypeCheckingData;
} {

	const cleanedLine:Line = {
		...line[0],
		text: replaceCompilerConstants(line[0].text, compilerConsts, false)
	};
	const cleanedText = cleanedLine.text;

	//If the text is a jump label, return
	if(getJumpLabel(cleanedText)){
		return {
			compiledCode: [
				[
					hasElement(stack, "namespace") ?
						`${addNamespacesToVariable(getJumpLabel(cleanedText)!, stack)}:` : cleanedLine.text,
					line[1], cleanedLine
				] as CompiledLine
			]
		};
	}

	const args = splitLineIntoArguments(cleanedText)
		.map(arg => prependFilenameToArg(arg, isMain, settings.filename));
	//If an argument starts with __, then prepend __[filename] to avoid name conflicts.


	//Handle ending of blocks, TODO move out of this function
	if(args[0] == "}"){
		const modifiedStack = stack.slice();
		const removedElement = modifiedStack.pop();
		if(!removedElement){
			throw new CompilerError("No block to end");
		}
		if(removedElement.commandDefinition.onend){
			return {
				...(removedElement.commandDefinition as CompilerCommandDefinition<StackElement>).onend!({line: cleanedLine, removedElement, settings, compilerConsts, stack}),
				modifiedStack
			};
		} else {
			return {
				compiledCode: [],
				modifiedStack
			};
		}
	}

	//TODO move compiler command handling out of this function
	const [ commandList, errors ] = (
		args[0].startsWith("&") || args[0] == "namespace" ? getCompilerCommandDefinitions : getCommandDefinitions
	)(cleanedText, true);

	//TODO refactor this block out
	if(commandList.length == 0){
		//No commands were valid
		if(errors.length == 0){
			throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line[1].text}"\nPlease copy this and file an issue on Github.`);
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
	if(commandList[0].type == "CompilerCommand"){
		if(commandList[0].onbegin){
			const { compiledCode, element, skipTypeChecks } = commandList[0].onbegin({line: cleanedLine, stack, settings, compilerConsts});
			return {
				compiledCode,
				modifiedStack: element ? stack.concat(element) : undefined,
				skipTypeChecks
			};
		} else {
			return {
				compiledCode: []
			};
		}
	}
	return {
		compiledCode: addSourcesToCode(getOutputForCommand(args, commandList[0], stack), line[1], cleanedLine)
	};

}

/**Gets the compiled output for a command given a command definition and the stack. */
export function getOutputForCommand(args:string[], command:CommandDefinition, stack:StackElement[]):string[] {
	if(command.replace){
		const compiledCommand = command.replace(args);
		return compiledCommand.map(line => {
			const compiledCommandDefinition = getCommandDefinition(line);
			if(!compiledCommandDefinition){
				Log.dump({args, command, compiledCommand, line, compiledCommandDefinition});
				throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
			}
			return addNamespacesToLine(splitLineIntoArguments(line), compiledCommandDefinition, stack);
		});
	}
	return [ addNamespacesToLine(args, command, stack) ];
}

/**Adds jump labels to vanilla MLOG code that uses hardcoded jump indexes. */
export function addJumpLabels(code:string[]):string[] {
	let lastJumpNameIndex = 0;
	const jumps: {
		[index: string]: string;
	} = {};
	const transformedCode:string[] = [];
	const outputCode:string[] = [];

	const cleanedCode = code.map(line => cleanLine(line)).filter(line => line);
	cleanedCode.forEach(line => {
		if(getJumpLabel(line)) throw new CompilerError(`Line ${line} contains a jump label. This code is only meant for direct processor output.`);
	});

	//Identify all jump addresses
	for(const line of cleanedCode){
		const label = getJumpLabelUsed(line);
		if(label){
			if(label == "0"){
				jumps[label] = "0";
			} else if(!isNaN(parseInt(label)) && !jumps[label]){
				jumps[label] = `jump_${lastJumpNameIndex}_`;
				lastJumpNameIndex += 1;
			}
		}
	}

	//Replace jump addresses with jump labels
	for(const line of cleanedCode){
		const commandDefinition = getCommandDefinition(line);
		if(commandDefinition == commands.jump[0] || commandDefinition == commands.jump[1]){
			const label = getJumpLabelUsed(line);
			if(label == undefined) throw new CompilerError("invalid jump statement");
			transformedCode.push(
				transformCommand(
					splitLineIntoArguments(line),
					commandDefinition,
					//Replace arguments
					(arg:string) => jumps[arg] ?? (isNaN(parseInt(arg)) ? arg : impossible()),
					//But only if the argument is a jump address
					(arg:string, carg:Arg) => carg.isGeneric && carg.type == "jumpAddress"
				).join(" ")
			);
		} else if(commandDefinition != undefined || getJumpLabel(line)){
			transformedCode.push(line);
		} else {
			Log.printMessage("line invalid", {line});
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

export function portCode(program:string[], mode:PortingMode):string[] {
	return program.map((line, index) => {

		const cleanedLine:Line = {
			text: cleanLine(line),
			lineNumber: index + 1,
			sourceFilename: "unknown.mlogx"
		};
		const leadingTabsOrSpaces = line.match(/^[ \t]*/) ?? "";
		const comment = line.match(/#.*$/) ?? "";
		let commandDefinition = getCommandDefinition(cleanedLine.text);
		const args = splitLineIntoArguments(cleanedLine.text);
		while(commandDefinition == null && args.at(-1) == "0"){
			args.splice(-1, 1);
			cleanedLine.text = args.join(" ");
			commandDefinition = getCommandDefinition(cleanedLine.text);
		}
		if(commandDefinition == null){
			Log.printMessage("cannot port invalid line", {line: cleanedLine});
		} else if(commandDefinition.port) {
			return leadingTabsOrSpaces + commandDefinition.port(args, mode) + comment;
		}
		return leadingTabsOrSpaces + args.join(" ") + comment;
	});
}

