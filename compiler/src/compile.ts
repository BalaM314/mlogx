/**
Copyright © <BalaM314>, 2024.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains pure-ish functions related to compiling.
*/

import deepmerge from "deepmerge";
import { Arg, SenseTargets } from "./args.js";
import { CompilerError, Statement } from "./classes.js";
import { CommandDefinition, CompilerCommandDefinition } from "./commands.js";
import { maxLines, processorVariables, requiredVarCode } from "./consts.js";
import {
	addSourcesToCode, cleanLine, formatLineWithPrefix,
	getAllPossibleVariablesUsed, getCommandDefinition, getCommandDefinitions,
	getCompilerCommandDefinitions, getJumpLabelsDefined, getJumpLabelsUsed, splitLineOnSemicolons,
	getParameters, getVariablesDefined, impossible, isInputAcceptedByAnyType,
	parsePreprocessorDirectives, prependFilenameToToken, removeUnusedJumps, replaceCompilerConstants,
	splitLineIntoTokens, transformCommand
} from "./funcs.js";
import { Log } from "./Log.js";
import { State } from "./settings.js";
import { hasElement, StackElement } from "./stack_elements.js";
import { CommandErrorType, Line, PortingMode, TData, TypeCheckingData } from "./types.js";

export function compileMlogxToMlog(
	mlogxProgram:string[],
	state:State,
	typeDefinitions:TypeCheckingData = {
		jumpLabelsDefined: {},
		jumpLabelsUsed: {},
		variableDefinitions: {},
		variableUsages: {},
	},
):{outputProgram:Statement[], typeCheckingData:TypeCheckingData} {

	const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);

	const isMain = programType == "main" || state.compilerOptions.mode == "single";
	const cleanedProgram = cleanProgram(mlogxProgram, state);
	const compiledProgram:Statement[] = [];
	let stack:StackElement[] = [];

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
			compiledProgram.push(...requiredVarCode[requiredVar][0].map(
				line => new Statement(
					line, `['#require'd variable]`, `['#require'd variable]`,
					`['#require'd variable]`, `['#require'd variable]`, 0
				)
			));
			typeCheckingData.variableDefinitions[requiredVar] = [{
				variableType: requiredVarCode[requiredVar][1],
				line: {
					text: `['#require'd variable]`,
					lineNumber: 0,
					sourceFilename: `['#require'd variable]`,
				}
			}];
		} else {
			Log.printMessage("unknown require", {requiredVar});
		}
	}


	let hasInvalidStatements = false;
	//Loop through each line and compile it

	for(const [cleanedLine, sourceLine] of cleanedProgram){
		try {
			let modifiedLine = cleanedLine;
			for(const def of stack.map(el => el.commandDefinition).reverse()){
				if(def.onprecompile){
					const outputData = def.onprecompile({line: modifiedLine, stack, state});
					if("skipCompilation" in outputData) continue;
					modifiedLine = outputData.output;
				}
			}
			const { compiledCode, modifiedStack, skipTypeChecks, typeCheckingData: outputTypeCheckingData }
				= compileLine([modifiedLine, sourceLine], state, isMain, stack);
			if(modifiedStack) stack = modifiedStack; //ew mutable data
			let doTypeChecks = !skipTypeChecks;
			let modifiedCode = compiledCode;
			for(const def of stack.map(el => el.commandDefinition).reverse()){
				if(def.onpostcompile){
					const { modifiedOutput, skipTypeChecks } = def.onpostcompile({compiledOutput: compiledCode, state, stack});
					if(skipTypeChecks) doTypeChecks = false;
					modifiedCode = modifiedOutput;
					if(modifiedOutput.length == 0) break;
				}
			}
			if(doTypeChecks){
				try {
					for(const compiledLine of compiledCode){
						typeCheckStatement(compiledLine, typeCheckingData);
					}
				} catch(err){
					if(err instanceof CompilerError){
						Log.err(
`${err.message}
${formatLineWithPrefix(sourceLine)}`
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
${formatLineWithPrefix(sourceLine)}`
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
`${
	element.type == "namespace" ? `Namespace "${element.name}"` :
		element.type == "&for" ? `For loop with variable "${element.variableName}"`
			: `&if statement`} was not closed.
${formatLineWithPrefix(element.line)}`
			);
		}
		CompilerError.throw("unclosed blocks", {});
	}

	
	if(state.compilerOptions.checkTypes && !hasInvalidStatements)
		printTypeErrors(typeCheckingData);
	
	const outputProgram =
		state.compilerOptions.removeUnusedJumpLabels ?
			removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed) :
			compiledProgram;

	if(outputProgram.length > maxLines){
		Log.printMessage("program too long", {});
	}

	return {outputProgram, typeCheckingData};
	
}

export function typeCheckStatement(statement:Statement, typeCheckingData:TypeCheckingData){
	
	if(cleanLine(statement.text) == "") Log.warn("mlogx generated a blank line. This should not happen.");
	//TODO maybe remove this check?


	for(const labelName of getJumpLabelsDefined(statement.tokens, statement.commandDefinitions[0])){
		typeCheckingData.jumpLabelsDefined[labelName] ??= [];
		typeCheckingData.jumpLabelsDefined[labelName].push({
			line: statement.sourceLine()
		});
		return;
	}

	if(statement.commandDefinitions.length == 0){
		CompilerError.throw("type checking invalid commands", {});
	}
	if(statement.modifiedSource.commandDefinitions.length == 0){
		Log.printMessage("invalid uncompiled command definition", {statement});
	}

	for(const jumpLabelUsed of getJumpLabelsUsed(statement.tokens, statement.commandDefinitions[0])){
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed] ??= [];
		typeCheckingData.jumpLabelsUsed[jumpLabelUsed].push({
			line: statement.cleanedSourceLine()
		});
	}

	for(const commandDefinition of statement.commandDefinitions){
		getVariablesDefined(statement, commandDefinition).forEach(([variableName, variableType]) => {
			typeCheckingData.variableDefinitions[variableName] ??= [];
			typeCheckingData.variableDefinitions[variableName].push({
				variableType,
				line: statement.cleanedSourceLine()
			});
		});
	}

	getAllPossibleVariablesUsed(statement).forEach(([variableName, variableTypes]) => {
		typeCheckingData.variableUsages[variableName] ??= [];
		typeCheckingData.variableUsages[variableName].push({
			variableTypes,
			line: statement.cleanedSourceLine()
		});
	});

	return;
}

export function printTypeErrors({variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed}: TypeCheckingData){
	//Check for conflicting definitions
	for(const [name, definitions] of Object.entries(variableDefinitions)){
		//Create a list of each definition's type and remove duplicates.
		//If this list has more than one element there are definitions of conflicting types.
		const typesSet = new Set(
			definitions.map(el => el.variableType)
				.filter(el =>
					el != "any" && el != "variable" &&
					el != "null"
				).map(el => el == "boolean" || el == "color" ? "number" : el)
		);
		if(typesSet.has("senseTarget")){
			//If the variable was defined as sense target, ignore subsequent definitions as unit or building type
			SenseTargets.forEach(s => typesSet.delete(s));
		}
		//TODO do this properly
		if(typesSet.size > 1){
			const types = [...typesSet];
			Log.printMessage("variable redefined with conflicting type", {
				name, types,
				firstDefinitionLine: definitions.filter(d => d.variableType == types[0])[0].line,
				conflictingDefinitionLine: definitions.filter(v => v.variableType == types[1])[0].line
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
			} else if(!isInputAcceptedByAnyType(variableDefinitions[name][0].variableType, variableUsage.variableTypes)){
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

export function cleanProgram(program:string[], state:State){
	const outputProgram:[cleanedLine:Line, sourceLine:Line][] = [];
	for(const index in program){
		const sourceLine:Line = {
			lineNumber: + index + 1,
			text: program[index],
			sourceFilename: state.project.filename
		};
		const cleanedText = cleanLine(sourceLine.text);
		if(cleanedText != "") outputProgram.push(...splitLineOnSemicolons(cleanedText).map(l => [{
			text: l,
			lineNumber: sourceLine.lineNumber,
			sourceFilename: state.project.filename
		}, sourceLine] as [cleanedLine:Line, sourceLine:Line]));
	}
	return outputProgram;
}

export function compileLine(
	[cleanedLine, sourceLine]: [cleanedLine:Line, sourceLine:Line],
	state:State,
	isMain:boolean,
	stack:StackElement[]
): {
	compiledCode:Statement[];
	modifiedStack?:StackElement[];
	skipTypeChecks?:boolean;
	typeCheckingData?:TypeCheckingData;
} {

	
	cleanedLine.text = replaceCompilerConstants(cleanedLine.text, state.compilerConstants, hasElement(stack, '&for'));
	const cleanedText = cleanedLine.text;

	const tokens = splitLineIntoTokens(cleanedText)
		.map(token => prependFilenameToToken(token, isMain, state.project.filename));
	//If an argument starts with __, then prepend __[filename] to avoid name conflicts.


	//Handle ending of blocks
	if(tokens[0] == "}"){
		const modifiedStack = stack.slice();
		const removedElement = modifiedStack.pop();
		if(!removedElement){
			CompilerError.throw("no block to end", {});
		}
		if(removedElement.commandDefinition.onend){
			return {
				...(removedElement.commandDefinition as CompilerCommandDefinition<StackElement>).onend!(
					{line: cleanedLine, removedElement, state, stack}
				),
				modifiedStack
			};
		} else {
			return {
				compiledCode: [],
				modifiedStack
			};
		}
	}

	const [ commandList, errors ] = (
		tokens[0].startsWith("&") || tokens[0] == "namespace" ? getCompilerCommandDefinitions : getCommandDefinitions
	)(cleanedText, true);

	if(commandList.length == 0){
		//No commands were valid
		if(errors.length == 0){
			throw new Error(
`An error message was not generated. This is an error with MLOGX.
Debug information: "${sourceLine.text}"
Please copy this and file an issue on Github.`
			);
		}
		if(errors.length == 1){
			throw new CompilerError(errors[0].message);
		} else {

			//Find the right error message
			if(state.verbose){
				CompilerError.throw("line matched no overloads", {commandName: tokens[0], errors});
			} else {
				const typeErrors = errors.filter(error => error.type == CommandErrorType.type);
				const highPriorityErrors = errors.filter(error => !error.lowPriority);
				if(typeErrors.length == 1){
					//one of the errors was a type error
					throw new CompilerError(typeErrors[0].message + `\nErrors for other overloads not displayed.`);
				} else if(highPriorityErrors.length == 1){
					throw new CompilerError(errors[0].message);
				} else {
					//Otherwise there's nothing that can be done and we have to say "no overloads matched"
					CompilerError.throw("line matched no overloads", {commandName: tokens[0]});
				}
			}
		}
	}
	//Otherwise, the command was valid, so output
	if(commandList[0].type == "CompilerCommand"){
		if(commandList[0].onbegin){
			const { compiledCode, element, skipTypeChecks } = commandList[0].onbegin({line: cleanedLine, stack, state});
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
		compiledCode: addSourcesToCode(getOutputForCommand(tokens, commandList[0]), cleanedLine, cleanedLine, sourceLine)
	};

}

/**Gets the compiled output for a command given a command definition. */
export function getOutputForCommand(tokens:string[], command:CommandDefinition):string[] {
	if(command.replace){
		const compiledCommand = command.replace(tokens);
		compiledCommand.forEach(line => {
			const compiledCommandDefinition = getCommandDefinition(line);
			if(!compiledCommandDefinition){
				Log.dump({tokens, command, compiledCommand, line, compiledCommandDefinition});
				throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
			}
		});
		return compiledCommand;
	}
	return [ tokens.join(" ") ];
}

/**Adds jump labels to vanilla MLOG code that uses hardcoded jump indexes. */
export function addJumpLabels(code:string[]):string[] {

	//This code calls functions like splitLineIntoArguments and getCommandDefinitions multiple times due to the need for multiple passes.
	//It can probably be reworked to not do that.

	let lastJumpNameIndex = 0;
	const jumps: {
		[index: string]: string;
	} = {};
	const transformedCode:string[] = [];
	const outputCode:string[] = [];

	const cleanedCode = code.map(line => cleanLine(line)).filter(line => line);
	cleanedCode.forEach(line => {
		const commandDefinition = getCommandDefinition(line);
		if(!commandDefinition)
			Log.printMessage("line invalid", {line});
		else if(getJumpLabelsDefined(splitLineIntoTokens(line), commandDefinition).length > 0)
			CompilerError.throw("genLabels contains label", {line});
	});

	//Identify all jump addresses
	for(const line of cleanedCode){
		const tokens = splitLineIntoTokens(line);
		const commandDefinition = getCommandDefinition(line);
		if(!commandDefinition) continue;
		for(const label of getJumpLabelsUsed(tokens, commandDefinition)){
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
		const tokens = splitLineIntoTokens(line);
		const commandDefinition = getCommandDefinition(line);
		if(commandDefinition){
			const labels = getJumpLabelsUsed(tokens, commandDefinition);
			if(labels.length > 0){
				transformedCode.push(
					transformCommand(
						tokens,
						commandDefinition,
						//Replace arguments
						(token:string) => jumps[token] ?? (isNaN(parseInt(token)) ? token : impossible()),
						//But only if the argument is a jump address
						(token:string, arg:Arg) => arg.isGeneric && arg.type == "jumpAddress"
					).join(" ")
				);
			} else {
				transformedCode.push(line);
			}
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
	const output:string[] = [];
	for(const [index, line] of program.entries()){
		const cleanedLine:Line = {
			text: cleanLine(line),
			lineNumber: index + 1,
			sourceFilename: "unknown.mlogx" //TODO obtain
		};
		if(cleanedLine.text == "") continue;
		const leadingTabsOrSpaces = line.match(/^[ \t]*/) ?? "";
		const comment = line.match(/#.*$/) ?? "";
		let commandDefinition = getCommandDefinition(cleanedLine.text);
		const tokens = splitLineIntoTokens(cleanedLine.text);

		while(commandDefinition == null && tokens.at(-1) == "0"){
			//If the line is invalid, and there's a zero at the end, try removing it
			tokens.splice(-1, 1);
			cleanedLine.text = tokens.join(" ");
			commandDefinition = getCommandDefinition(cleanedLine.text);
		}
		let rawLine;
		if(commandDefinition == null){
			Log.printMessage("cannot port invalid line", {line: cleanedLine});
			rawLine = tokens.join(" ");
		} else if(commandDefinition.port) {
			rawLine = commandDefinition.port(tokens, mode);
		} else {
			rawLine = tokens.join(" ");
		}
		output.push(leadingTabsOrSpaces + rawLine + comment);
	}
	return output;
}

