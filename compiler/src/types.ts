/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains type definitions and enums.
*/

import { Arg } from "./classes.js";

export interface Settings {
	name: string;
	authors: string[];
	filename: string;
	compilerOptions: {
		include: string[];
		removeComments: boolean;
		compileWithErrors: boolean;
		mode: "project" | "single";
		prependFileName: boolean;
		checkTypes: boolean;
		verbose: boolean;
		removeUnusedJumpLabels: boolean;
		removeCompilerMark: boolean;
	};
	compilerConstants: {
		[index: string]: CompilerConst;
	}
}

export type PartialRecursive<T> = {
	[P in keyof T]?: (T[P] extends Record<string, unknown> ? PartialRecursive<T[P]> : T[P]) | undefined;
};

/**Generic Arg Type */
export enum GAT {
	variable="variable",
	number="number",
	string="string",
	boolean="boolean",
	type="type",
	building="building",
	unit="unit",
	function="function",
	any="any",
	null="null",
	operandTest="operandTest",
	targetClass="targetClass",
	unitSortCriteria="unitSortCriteria",
	valid="valid",
	operandDouble="operandDouble",
	operandSingle="operandSingle",
	lookupType="lookupType",
	jumpAddress="jumpAddress",
	buildingGroup="buildingGroup",
	invalid="invalid",
	ctype="ctype",
	/** short(or symbolic?) operand double */
	sOperandDouble="sOperandDouble",
}
export const GenericArgType = GAT;

export enum PortingMode {
	/** Just removes trailing zeroes. */
	removeZeroes,
	/** Goes to syntax with improved argument order. */
	updateSyntax,
	/** Switches to the modern op syntax. */
	modernSyntax
}

export enum CommandErrorType {
	argumentCount,
	type,
	noCommand,
	badStructure,
}

export interface CommandError {
	type: CommandErrorType;
	message: string;
}

export interface CommandDefinition {
	type: "Command";
	args: Arg[];
	replace?: (args:string[]) => string[];
	port?: (args:string[], mode:PortingMode) => string;
	description: string;
	name: string;
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][]
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][]
}

export interface PreprocessedCommand {
	args: string;
	replace?: string[] | ((args:string[]) => string[]);
	port?: (args:string[], type:PortingMode) => string;
	description: string;
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][]
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][]
}

export interface CommandDefinitions {
	[index: string]: CommandDefinition[];
}

export interface PreprocessedCommandDefinitions {
	[index: string]: PreprocessedCommand[]
}

export interface CompilerCommandDefinition<StackEl> {
	type: "CompilerCommand"
	args: Arg[];
	name: string;
	description: string;
	onbegin?: (args:string[], line:Line, stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		element:StackEl | null;
		skipTypeChecks?:boolean;
	};
	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	}
	onend?: (line:Line, removedStackElement:StackEl) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	};
}


export interface PreprocessedCompilerCommandDefinition<StackEl> {
	args: string;
	description: string;
	onbegin?: (args:string[], line:Line, stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		element:Omit<StackEl, "commandDefinition"> | null;
		skipTypeChecks?:boolean;
	};
	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	}
	onend?: (line:Line, removedStackElement:StackEl) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	};
}

export interface CompilerCommandDefinitionGroup<StackEl> {
	stackElement: boolean;
	overloads: CompilerCommandDefinition<StackEl>[];
}

export interface PreprocessedCompilerCommandDefinitionGroup<StackEl> {
	stackElement: boolean;
	overloads: PreprocessedCompilerCommandDefinition<StackEl>[];
}

export interface StackElementMapping {
	'&for': ForStackElement;
	'&if': IfStackElement;
	'namespace': NamespaceStackElement;
}

export type PreprocessedCompilerCommandDefinitions = {
	[ID in keyof StackElementMapping]: PreprocessedCompilerCommandDefinitionGroup<StackElementMapping[ID]>
}

export type CompilerCommandDefinitions = {
	[ID in keyof StackElementMapping]: CompilerCommandDefinitionGroup<StackElementMapping[ID]>
}

export type ArgType = GAT | string;
export type PreprocessedArg = `${"..."|""}${string}:${"*"|""}${string}${"?"|""}` | `${string}`;

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
	loopBuffer: CompiledLine[];
}
export interface IfStackElement extends BaseStackElement {
	type: "&if";
	enabled: boolean;
}

export type StackElement = NamespaceStackElement | ForStackElement | IfStackElement;
export type CompiledLine = [compiledCode:string, source:Line];

export type CompilerConst = string | number | boolean | (string | number | boolean)[];
export type CompilerConsts = Map<string, CompilerConst>;
export interface Line {
	text: string;
	lineNumber: number;
}

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
