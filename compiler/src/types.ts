/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains type definitions and enums.
*/

import { ArgType } from "./args.js";


/**Makes every property in an object and all of its child objects optional. */
export type PartialRecursive<T> = {
	[P in keyof T]?: (T[P] extends Record<string, unknown> ? PartialRecursive<T[P]> : T[P]) | undefined;
};
export type keyofMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;
export type none = Record<string, never>


export enum PortingMode {
	/** Just removes trailing zeroes. */
	removeZeroes,
	/** Goes to syntax with improved argument order. */
	shortenSyntax,
	/** Switches to the modern op syntax. Not yet implemented. */
	modernSyntax
}

export enum CommandErrorType {
	argumentCount="argumentCount",
	type="type",
	noCommand="noCommand",
	badStructure="badStructure",
}

export interface CommandError {
	type: CommandErrorType;
	message: string;
}

export interface Line {
	text: string;
	lineNumber: number;
}
export type CompiledLine = [compiledCode:string, source:Line];

export type CompilerConst = string | number | boolean | (string | number | boolean)[];
export type CompilerConsts = Map<string, CompilerConst>;

export namespace TData {
	export interface variableUsages {
		[name: string]: {
			variableTypes: ArgType[];
			line: Line;
		}[]
	}
	export interface variableDefinitions {
		[name: string]: {
			variableType: ArgType;
			line: Line;
		}[]
	}
	export interface jumpLabelsUsed {
		[name: string]: {
			line: Line;
		}[]
	}
	export interface jumpLabelsDefined {
		[name: string]: {
			line: Line;
		}[]
	}
}
export interface TypeCheckingData {
	//I do wish keyof worked on namespaces...
	variableUsages: TData.variableUsages;
	variableDefinitions: TData.variableDefinitions;
	jumpLabelsUsed: TData.jumpLabelsUsed;
	jumpLabelsDefined: TData.jumpLabelsDefined;
}
