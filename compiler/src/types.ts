/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains type definitions and enums.
*/

import { Arg } from "./classes.js";
import { GenericArgs } from "./generic_args.js";

export interface Settings {
	name: string;
	authors: string[];
	filename: string;
	compilerOptions: {
		/**A list of stdlib files that should be included in a project's compiled output. */
		include: string[];
		/**Whether or not to remove comments. Also removes trailing whitespace/tabs. May not work. */
		removeComments: boolean;
		/**Whether to compile anyway if errors are found. Currently a bit broken. */
		compileWithErrors: boolean;
		/**Whether to compile as a project or a collection of standalone files. */
		mode: "project" | "single";
		/**If enabled, prepends the file name to all args starting with two underscores. */
		prependFileName: boolean;
		/**Enables type checking. */
		checkTypes: boolean;
		/**Displays extra information. */
		verbose: boolean;
		/**Removes unused jump labels from compiled output. Useful if you use jump labels as labels. */
		removeUnusedJumpLabels: boolean;
		/**Please don't remove the compiler mark... */
		removeCompilerMark: boolean;
	};
	compilerConstants: {
		[index: string]: CompilerConst;
	}
}

/**Makes every property in an object and all of its child objects optional. */
export type PartialRecursive<T> = {
	[P in keyof T]?: (T[P] extends Record<string, unknown> ? PartialRecursive<T[P]> : T[P]) | undefined;
};


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

/**Contains all the information for a command definition. */
export interface CommandDefinition {
	/**Needed to stop this being equivalent to a CompilerCommandDefinition. */
	type: "Command";
	/**List of Args for the command. */
	args: Arg[];
	/**A function that is called to get the compiled output for a command. */
	replace?: (args:string[]) => string[];
	/**
	 * A function that is called to port an instruction from MLOG to MLOGX.
	 * Example: calling this on the command definition of `jump x always 0 0` will return `jump x` or `jump x always` depending on the mode.
	 */
	port?: (args:string[], mode:PortingMode) => string;
	description: string;
	name: string;
	/**Gets all variables defined by a command. */
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][]
	/**Gets all variables used by a command. */
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][]
}

/**Contains all the information for a command definition but without the boilerplate. Processed into a CommandDefinition. */
export interface PreprocessedCommand {
	/**
	 * The args for this command.
	 * Format: `input1:number input2:string output:*string`
	 */
	args: string;
	/**Specifies the compiled output for a command. Can be a function or an array of strings, where %1 gets replaced with the first arg, and so on.*/
	replace?: string[] | ((args:string[]) => string[]);
	/**
	 * A function that is called to port an instruction from MLOG to MLOGX.
	 * Example: calling this on the command definition of `jump x always 0 0` will return `jump x` or `jump x always` depending on the mode.
	 */
	port?: (args:string[], mode:PortingMode) => string;
	description: string;
	/**Gets all variables defined by a command. */
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][]
	/**Gets all variables used by a command. */
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][]
}

export type CommandDefinitions<IDs extends string> = {
	[ID in IDs]: CommandDefinition[];
}

export type PreprocessedCommandDefinitions<IDs extends string> = {
	[ID in IDs]: PreprocessedCommand[]
}

export interface CompilerCommandDefinition<StackEl> {
	/**Needed to stop this being equivalent to a CommandDefinition. */
	type: "CompilerCommand"
	/**List of Args for the command. */
	args: Arg[];
	name: string;
	description: string;
	/**Called when a block begins. */
	onbegin?: (args:string[], line:Line, stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		element:StackEl | null;
		skipTypeChecks?:boolean;
	};
	/**Called on each line in a block. */
	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	}
	/**Called when a block ends. */
	onend?: (line:Line, removedStackElement:StackEl) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	};
}


export interface PreprocessedCompilerCommandDefinition<StackEl> {
	/**
	 * The args for this command.
	 * Format: `input1:number input2:string output:*string`
	 */
	args: string;
	description: string;
	/**Called when a block begins. */
	onbegin?: (args:string[], line:Line, stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		element:Omit<StackEl, "commandDefinition"> | null;
		skipTypeChecks?:boolean;
	};
	/**Called on each line in a block. */
	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		compiledCode:CompiledLine[];
		skipTypeChecks?:boolean;
	}
	/**Called when a block ends. */
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

export type keyofMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;
export type GAT = keyofMap<typeof GenericArgs>;
export type ArgType = GAT | string;
export type PreprocessedArg = `${"..."|""}${string}:${"*"|""}${string}${"?"|""}` | `${string}`;


export interface PreprocessedArgKey {
	/**Checks if a string is valid for this arg. Can be a regex, an array of strings or regexes, or a function. */
	validator: RegExp | (string | RegExp)[] | ((arg:string) => boolean);
	/**A list of other arg types that are also accepted. Example: "number" also accepts "variable". */
	alsoAccepts?: string[];
	/**
	 * A list of other arg types that cannot be accepted. If the string is valid for any of these, it's invalid.
	 * Example: if a string is valid for unit, it should not be valid for a variable.
	 */
	exclude?: string[];
	/**If this is true, typeofArg() will not estimate this as the type of an arg. Useful for things like jumpAddress. */
	doNotGuess?: true;
}
export interface ArgKey {
	/**Checks if a string is valid for this arg. Can be an array of strings or regexes or a function. */
	validator: (string | RegExp)[] | ((arg:string) => boolean);
	/**A list of other arg types that are also accepted. Example: "number" also accepts "variable". */
	alsoAccepts: string[];
	/**
	 * A list of other arg types that cannot be accepted. If the string is valid for any of these, it's invalid.
	 * Example: if a string is valid for unit, it should not be valid for a variable.
	 */
	exclude: string[];
	/**If this is true, typeofArg() will not estimate this as the type of an arg. Useful for things like jumpAddress. */
	doNotGuess: boolean;
}

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
