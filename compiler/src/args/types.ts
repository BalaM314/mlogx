/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains functions related to command args.
*/


import { keyofMap } from "../types.js";
import { GenericArgs } from "./generic_args.js";




/**Represents an argument for a command.*/
export interface Arg {
	type:ArgType,
	name:string,
	isOptional:boolean,
	isGeneric:boolean,
	isVariable:boolean,
	spread:boolean
}

/** Any generic arg type(like number, building) */
export type GAT = keyofMap<typeof GenericArgs>;
export type ArgType = GAT | string;
export type PreprocessedArg = `${"..."|""}${string}:${"*"|""}${string}${"?"|""}` | `${string}`;

export interface PreprocessedArgKey {
	/**Checks if a token is valid for this arg. Can be a regex, an array of strings or regexes, or a function. */
	validator: RegExp | (string | RegExp)[] | ((arg:string) => boolean);
	/**A list of other arg types that are also accepted. Example: "number" also accepts "variable". */
	alsoAccepts?: string[];
	/**
	 * A list of other arg types that cannot be accepted. If the token is valid for any of these, it's invalid.
	 * Example: if a token is valid for unit, it should not be valid for variable.
	 */
	exclude?: string[];
	/**If this is true, guessTokenType() will not guess this as the type of a token. Useful for things like jumpAddress. */
	doNotGuess?: true;
	description?: string;
}
export interface ArgKey {
	/**Checks if a token is valid for this arg. Can be an array of strings or regexes or a function. */
	validator: (string | RegExp)[] | ((arg:string) => boolean);
	/**A list of other arg types that are also accepted. Example: "number" also accepts "variable". */
	alsoAccepts: string[];
	/**
	 * A list of other arg types that cannot be accepted. If the token is valid for any of these, it's invalid.
	 * Example: if a token is valid for unit, it should not be valid for a variable.
	 */
	exclude: string[];
	/**If this is true, guessTokenType() will not guess this as the type of a token. Useful for things like jumpAddress. */
	doNotGuess: boolean;
	description?: string;
}