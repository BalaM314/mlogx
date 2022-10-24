/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains test-related utility functions.
*/

import { compilerCommands } from "../src/commands.js";
import { ForStackElement, IfStackElement, NamespaceStackElement } from "../src/stack_elements.js";
import { CommandError, CommandErrorType, Line } from "../src/types.js";



export function makeNamespaceEl(name:string):NamespaceStackElement {
	return {type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: {lineNumber:1, text: `namespace ${name} {`, sourceFilename: "[test]"}};
}
export function makeForEl(varname:string, elements:string[], loopBuffer:string[] = [], sourceLine?:Line):ForStackElement {
	const isNumbers = elements.filter(el => isNaN(parseInt(el))).length == 0;
	return {
		type: "&for",
		commandDefinition: compilerCommands["&for"].overloads[isNumbers ? 0 : 1],
		variableName: varname,
		elements,
		loopBuffer: loopBuffer.map(line => makeLine(line)),
		line: sourceLine ?? {lineNumber:1, text: isNumbers ? `&for ${varname} in ${elements.map(el => parseInt(el)).sort((a, b) => a - b)[0]} ${elements.map(el => parseInt(el)).sort((a, b) => a - b).at(-1)} {` : `&for ${varname} of ${elements.join(" ")} {`, sourceFilename: "[test]"}
	};
}
export function makeIfEl(enabled:boolean):IfStackElement {
	return {type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: {lineNumber:420, text: "[test]", sourceFilename: "[test]"}, enabled};
}
export function commandErrOfType(type:keyof typeof CommandErrorType):jasmine.ExpectedRecursive<CommandError> {
	return {
		type: CommandErrorType[type],
		message: jasmine.any(String)
	};
}

export function makeLine(text:string, lineNumber:number = 1, sourceFilename:string = "[test]"):Line {
	return {
		text, lineNumber, sourceFilename
	};
}

export function makeCompileLineInput(text:string, sourceText?:string):[cleanedLine: Line, sourceLine: Line] {
	return [makeLine(text), sourceText ? makeLine(sourceText) : makeLine(text)];
}

export const anyLine:jasmine.ExpectedRecursive<Line> = {
	lineNumber: jasmine.any(Number),
	text: jasmine.any(String),
	sourceFilename: jasmine.any(String)
};

export const blankLine = {
	text: "[test]",
	lineNumber: 1,
	sourceFilename: "[test]"
};
