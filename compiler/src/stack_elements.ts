/**
Copyright © <BalaM314>, 2024.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various constants.
*/

import { Statement } from "./classes.js";
import { CompilerCommandDefinition } from "./commands.js";
import { Line } from "./types.js";



interface BaseStackElement {
	line: Line;
	commandDefinition: CompilerCommandDefinition<this>;
}
export interface NamespaceStackElement extends BaseStackElement {
	type: "namespace";
	name: string;
}
export interface ForStackElement extends BaseStackElement {
	type: "&for";
	elements: string[];
	variableName: string;
	loopBuffer: Statement[];
}
export interface IfStackElement extends BaseStackElement {
	type: "&if";
	enabled: boolean;
}

export type StackElement = NamespaceStackElement | ForStackElement | IfStackElement;

export interface StackElementMapping {
	'&for': ForStackElement;
	'&if': IfStackElement;
	'namespace': NamespaceStackElement;
}


/**Returns if the stack contains an element of a particular type. */
export function hasElement(stack:StackElement[], type:StackElement["type"]):boolean {
	return stack.filter(el => el.type == type).length != 0;
}

/** Returns if the stack contains a disabled if statement */
export function hasDisabledIf(stack:StackElement[]):boolean {
	return stack.filter(el => el.type == "&if" && !el.enabled).length != 0;
}

/**Returns the topmost for loop in the stack. */
export function topForLoop(stack:StackElement[]):ForStackElement | null {
	return stack.filter(el => el.type == "&for").at(-1) as ForStackElement ?? null;
}
