/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains functions related to the commands AST.
*/

import { arg, PreprocessedArg } from "../args.js";
import { StackElement, StackElementMapping } from "../stack_elements.js";
import { Line } from "../types.js";
import {
	CommandDefinition, CommandDefinitions, CompilerCommandDefinition, CompilerCommandDefinitionGroup,
	CompilerCommandDefinitions, PreprocessedCommand, PreprocessedCommandDefinitions,
	PreprocessedCompilerCommandDefinitionGroup, PreprocessedCompilerCommandDefinitions
} from "./types.js";


/**
 * Processes commands(adds in what would otherwise be boilerplate).
 * Warning: called during initialization.
 **/
export function processCommands<IDs extends string>(
	preprocessedCommands:PreprocessedCommandDefinitions<IDs>
):CommandDefinitions<IDs> {

	const out:Partial<CommandDefinitions<IDs>> = {};
	for(const [name, commands] of (Object.entries(preprocessedCommands) as [name:IDs, commands:PreprocessedCommand[]][])){
		out[name] = [];
		for(const command of commands){
			const processedCommand:CommandDefinition = {
				type: "Command",
				description: command.description,
				name: name,
				args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg as PreprocessedArg)) : [],
				isMlog: command.replace == undefined,
				isWorldProc: command.isWorldProc ?? false,
				checkFirstTokenAsArg: name.startsWith("#"),
				getVariablesDefined: command.getVariablesDefined,
				getVariablesUsed: command.getVariablesUsed,
				port: command.port
			};
			if(command.replace instanceof Array){
				processedCommand.replace = function(args:string[]){
					return (command.replace as string[]).map(replaceLine => {
						for(let i = 1; i < args.length; i ++){
							replaceLine = replaceLine.replace(new RegExp(`%${i}`, "g"), args[i]);
						}
						return replaceLine;
					});
				};
			} else if(typeof command.replace == "function"){
				processedCommand.replace = command.replace;
			}
			out[name]!.push(processedCommand);
		}
	}
	return out as CommandDefinitions<IDs>;
}

export function processCompilerCommands(
	preprocessedCommands:PreprocessedCompilerCommandDefinitions
):CompilerCommandDefinitions {
	const out:Partial<CompilerCommandDefinitions> = {};
	for(
		const [id, group] of Object.entries(preprocessedCommands) as
		[keyof StackElementMapping, PreprocessedCompilerCommandDefinitionGroup<StackElementMapping[keyof StackElementMapping]>][]
	){
		out[id] = {
			stackElement: group.stackElement,
			overloads: []
		};

		type _PreprocessedCompilerCommandDefinitionGroup<T> =
			T extends infer A
			? PreprocessedCompilerCommandDefinitionGroup<A>
			: never;
		// interface SusCompilerCommandDefinition<StackEl> {
		// 	type: "CompilerCommand"
		// 	args: Arg[];
		// 	name: string;
		// 	description: string;
		// 	onbegin?: CompilerCommandDefinition<StackEl>["onbegin"] | PreprocessedCompilerCommandDefinition<StackEl>["onbegin"];
		// 	oninblock?: (compiledOutput:CompiledLine[], stack:StackElement[]) => {
		// 		compiledCode:CompiledLine[];
		// 		skipTypeChecks?:boolean;
		// 	}
		// 	onend?: (line:Line, removedStackElement:StackEl) => {
		// 		compiledCode:CompiledLine[];
		// 		skipTypeChecks?:boolean;
		// 	};
		// }
		// type SussierCompilerCommandDefinition<T> = T extends infer A ? SusCompilerCommandDefinition<A> : never;
		for(const command of (group as _PreprocessedCompilerCommandDefinitionGroup<StackElement>).overloads){
			/**
			 * Time for a rant.
			 * The onbegin() function of a command definition must return a stack element which points back to the command definition.
			 * This means I have to create the command definition and then modify the onbegin() prop.
			 * This causes typescript to yell at me.
			 * I tried low-level black magic for 30 minutes but couldn't get it to work.
			 * Therefore:
			 */
			//eslint-disable-next-line @typescript-eslint/no-explicit-any
			const commandDefinition:any = {
				type: "CompilerCommand",
				description: command.description,
				name: id,
				args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg as PreprocessedArg)) : [],
				checkFirstTokenAsArg: id.startsWith("#"),
				onbegin: command.onbegin,
				onprecompile: command.onprecompile,
				onpostcompile: command.onpostcompile,
				onend: command.onend,
			};
			if(commandDefinition.onbegin){
				const oldFunction = commandDefinition.onbegin!;
				commandDefinition.onbegin = (args:string[], line:Line, stack:StackElement[]) => {
					const outputData = oldFunction(args, line, stack);
					return {
						...outputData,
						element: {
							...outputData.element,
							commandDefinition
						}
					};
				};
			}
			(out[id]!.overloads as CompilerCommandDefinitionGroup<StackElement>["overloads"]).push(
				commandDefinition as CompilerCommandDefinition<StackElement>
			);
		}
	}
	return out as CompilerCommandDefinitions;
}
