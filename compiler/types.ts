/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { Arg } from "./classes.js";

export interface Settings {
	name: string;
	authors: string[];
	compilerOptions: {
		include: string[];
		removeComments: boolean;
		compileWithErrors: boolean;
		mode: "project" | "single";
		prependFileName: boolean;
		checkTypes: boolean;
		verbose: boolean;
		removeUnusedJumpLabels: boolean;
	};
	compilerConstants: {
		[index: string]: string;
	}
}

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
	ctype="ctype"
}
export const GenericArgType = GAT;

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
	args: Arg[];
	replace?: (args:string[]) => string[];
	description: string;
	name: string;
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][]
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][]
}

export interface PreprocessedCommand {
	args: string;
	replace?: string[] | ((args:string[]) => string[]);
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

export type ArgType = GAT | string;

export interface NamespaceStackElement {
	type: "namespace";
	name: string;
}
export interface ForStackElement {
	type: "&for";
	elements: string[];
	variableName: string;
	loopBuffer: CompiledLine[];
}

export type StackElement = NamespaceStackElement | ForStackElement;
export type CompiledLine = [compiledCode:string, source:Line];

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