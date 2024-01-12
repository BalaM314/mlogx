/**
Copyright © <BalaM314>, 2024.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains test-related utility functions.
*/

import { Statement } from "../src/classes.js";
import { compilerCommands } from "../src/commands.js";
import { getLocalState, getState } from "../src/funcs.js";
import { Settings, settingsSchema, State } from "../src/settings.js";
import { ForStackElement, IfStackElement, NamespaceStackElement } from "../src/stack_elements.js";
import { CommandError, CommandErrorType, Line } from "../src/types.js";



export function makeNamespaceEl(name:string):NamespaceStackElement {
	return {type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: {lineNumber:1, text: `namespace ${name} {`, sourceFilename: "[test]"}};
}
export function makeForEl(varname:string, elements:string[], loopBuffer:[text:string, source:string][] = [], sourceLine:Line = {lineNumber:420, text: "[test]", sourceFilename: "[test]"}):ForStackElement {
	const isNumbers = elements.filter(el => isNaN(parseInt(el))).length == 0;
	return {
		type: "&for",
		commandDefinition: compilerCommands["&for"].overloads[isNumbers ? 0 : 1],
		variableName: varname,
		elements,
		loopBuffer: loopBuffer.map(([text, source]) => makeStatement(text, source)),
		line: sourceLine ?? {lineNumber:1, text: isNumbers ? `&for ${varname} in ${elements.map(el => parseInt(el)).sort((a, b) => a - b)[0]} ${elements.map(el => parseInt(el)).sort((a, b) => a - b).at(-1)} {` : `&for ${varname} of ${elements.join(" ")} {`, sourceFilename: "[test]"}
	};
}
export function makeIfEl(enabled:boolean):IfStackElement {
	return {type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: {lineNumber:420, text: "[test]", sourceFilename: "[test]"}, enabled};
}
export function commandErrOfType(type:keyof typeof CommandErrorType):jasmine.ExpectedRecursive<CommandError> {
	return {
		type: CommandErrorType[type],
		message: jasmine.any(String),
		lowPriority: false
	};
}

export function makeStatement(text:string, source:string = text, cleanedSource:string = source, modifiedSource:string = cleanedSource, lineNumber:number = 1, sourceFilename:string = "[test]"):Statement {
	return new Statement(text, source, cleanedSource, modifiedSource, sourceFilename, lineNumber);
}

export function makeStatements(lines:string[]){
	return lines.map(line => makeStatement(line));
}

export function makeLine(text:string, lineNumber:number = 1, sourceFilename:string = "[test]"):Line {
	return {
		text, lineNumber, sourceFilename
	};
}

export function makeCompileLineInput(text:string, lineNumber:number = 1, sourceFilename:string = "[test]"):[cleanedLine:Line, sourceLine:Line] {
	return [{
		text, lineNumber, sourceFilename
	}, {
		text, lineNumber, sourceFilename
	}];
}

export function stateForFilename(name:string, compilerConsts:Settings["compilerConstants"] = {}, icons:Map<string, string> = new Map(), checkTypes:boolean = false):State {
	return getLocalState(getState(settingsSchema.validateSync({
		compilerOptions: {
			checkTypes
		},
		compilerConstants: compilerConsts
	}), name, {
		commandName: "compile",
		positionalArgs: [name],
		namedArgs: {}
	}), name, icons);
}

export const anyLine:jasmine.ExpectedRecursive<Line> = {
	lineNumber: jasmine.any(Number),
	text: jasmine.any(String),
	sourceFilename: jasmine.any(String)
};

export function errorWith<T>(callback:() => T, errorMessage:string):T {
	try {
		return callback();
	} catch(err){
		throw new Error((err as Error).message + "\n" + errorMessage);
	}
}
