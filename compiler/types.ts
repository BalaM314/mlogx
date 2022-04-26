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
	}
}

export enum GenericArgType {
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
	operand="operand",
	lookupType="lookupType",
	jumpAddress="jumpAddress",
	buildingGroup="buildingGroup",
}

export enum CommandErrorType {
	argumentCount,
	type
}

export interface CommandError {
	type: CommandErrorType;
	message: string;
}

export interface CommandDefinition {
	args: Arg[];
	replace?: string[];
	description: string;
	name: string;
}

export interface PreprocessedCommand {
	args: string;
	replace?: string[];
	description: string;
}

export interface CommandDefinitions {
	[index: string]: CommandDefinition[];
}

export interface PreprocessedCommandDefinitions {
	[index: string]: PreprocessedCommand[]
}

export type ArgType = GenericArgType | string;