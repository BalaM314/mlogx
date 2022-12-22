/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains type definitions related to commands.
*/

import { Arg, ArgType } from "../args.js";
import { Statement } from "../classes.js";
import { State } from "../settings.js";
import { StackElement, StackElementMapping } from "../stack_elements.js";
import { Line, PortingMode, TypeCheckingData } from "../types.js";




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
	/**Whether this command definition is valid MLOG. */
	isMlog: boolean;
	/**Whether this command definition is for a world proc only command. */
	isWorldProc: boolean;
	/**Gets all variables defined by a command. */
	getVariablesDefined?: (args:string[]) => [name:string, type:ArgType][];
	/**Gets all variables used by a command. */
	getVariablesUsed?: (args:string[]) => [name:string, types:ArgType[]][];
	/**Gets all variables defined by a command. */
	getJumpLabelsDefined?: (args:string[]) => string[];
	/**Gets all variables used by a command. */
	getJumpLabelsUsed?: (args:string[]) => string[];
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
	/**Whether this command definition is for a world proc only command. */
	isWorldProc?: boolean;
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
	onbegin?: ({line, stack, state}:{line:Line, stack:StackElement[], state:State}) => {
		compiledCode:Statement[];
		element:StackEl | null;
		skipTypeChecks?:boolean;
	};
	/**Called on each line in a block before it compiles. */
	onprecompile?: ({line, stack, state}:{line:Line, stack:StackElement[], state:State}) => {
		output:Line;
	} | {
		skipCompilation:true;
	}
	/**Called on each line in a block after it compiles. */
	onpostcompile?: ({compiledOutput, stack, state}:{compiledOutput:Statement[], stack:StackElement[], state:State}) => {
		modifiedOutput:Statement[];
		skipTypeChecks?:boolean;
	}
	/**Called when a block ends. */
	onend?: ({line, removedElement, state, stack}:{line:Line, removedElement:StackEl, state:State, stack:StackElement[]}) => {
		compiledCode:Statement[];
		skipTypeChecks?:boolean;
		typeCheckingData?:TypeCheckingData;
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
	onbegin?: ({line, stack, state}:{line:Line, stack:StackElement[], state:State}) => {
		compiledCode:Statement[];
		element:Omit<StackEl, "commandDefinition"> | null;
		skipTypeChecks?:boolean;
	};
	/**Called on each line in a block before it compiles. */
	onprecompile?: ({line, stack, state}:{line:Line, stack:StackElement[], state:State}) => {
		output:Line;
	} | {
		skipCompilation:true;
	}
	/**Called on each line in a block after it compiles. */
	onpostcompile?: ({compiledOutput, stack, state}:{compiledOutput:Statement[], stack:StackElement[], state:State}) => {
		modifiedOutput:Statement[];
		skipTypeChecks?:boolean;
	}
	/**Called when a block ends. */
	onend?: ({line, removedElement, state, stack}:{line:Line, removedElement:StackEl, state:State, stack:StackElement[]}) => {
		compiledCode:Statement[];
		skipTypeChecks?:boolean;
		typeCheckingData?:TypeCheckingData;
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

export type PreprocessedCompilerCommandDefinitions = {
	[ID in keyof StackElementMapping]: PreprocessedCompilerCommandDefinitionGroup<StackElementMapping[ID]>
}

export type CompilerCommandDefinitions = {
	[ID in keyof StackElementMapping]: CompilerCommandDefinitionGroup<StackElementMapping[ID]>
}