/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains test-related utility functions.
*/

import { compilerCommands } from "../src/commands.js";
import { addSourcesToCode } from "../src/funcs.js";
import { ForStackElement, IfStackElement, NamespaceStackElement } from "../src/stack_elements.js";
import { CommandError, CommandErrorType } from "../src/types.js";



export function makeNamespaceEl(name:string):NamespaceStackElement {
	return {type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: {lineNumber:1, text: `namespace ${name} {`}};
}
export function makeForEl(varname:string, elements:string[], loopBuffer:string[] = []):ForStackElement {
	return {type: "&for", commandDefinition: compilerCommands["&for"].overloads[elements.filter(el => !isNaN(parseInt(el))).length == elements.length ? 0 : 1], variableName: varname, elements, loopBuffer: addSourcesToCode(loopBuffer), line: {lineNumber:420, text: "[test]"}};
}
export function makeIfEl(enabled:boolean):IfStackElement {
	return {type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: {lineNumber:420, text: "[test]"}, enabled};
}
export function commandErrOfType(type:keyof typeof CommandErrorType){
	return {
		type,
		message: jasmine.any(String)
	} as unknown as CommandError;//:(
}
