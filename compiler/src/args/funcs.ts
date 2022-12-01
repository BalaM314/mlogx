/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains functions related to command args.
*/

import { isKey } from "../funcs.js";
import { GenericArgs } from "./generic_args.js";
import { Arg, ArgKey, GAT, PreprocessedArg } from "./types.js";



/**Converts an arg string into an Arg. */
export function arg(str:PreprocessedArg):Arg {
	const matchResult = str.match(/(\.\.\.)?(\w+):(\*)?(\w+)(\?)?/);
	if(!matchResult){
		if(str.includes(":")){
			throw new Error(`Probably bad arg string ${str}`);
		}
		return makeArg(str, str, false, false, false);
	}
	const [, spread, name, isVariable, type, isOptional] = matchResult;
	return makeArg(type, name, !! isOptional, isGenericArg(type), !! isVariable, !! spread);
}

export function argToString(arg:Arg):string {
	if(!arg.isGeneric)
		return `${arg.type}`;
	if(arg.isOptional)
		return `(${arg.spread ? "..." : ""}${arg.name}:${arg.isVariable ? "*" : ""}${arg.type})`;
	else
		return `[${arg.spread ? "..." : ""}${arg.name}:${arg.isVariable ? "*" : ""}${arg.type}]`;
}

/**Makes an arg using ordered arguments */
export function makeArg(type:string, name:string = "WIP", isOptional:boolean = false, isGeneric:boolean = true, isVariable:boolean = false, spread:boolean = false){
	return {
		type, name, isOptional, isGeneric, isVariable, spread
	};
}

/**Returns if an argument is generic or not. */
export function isGenericArg(val:string): val is GAT {
	return GenericArgs.has(val as GAT);
}

/**Estimates the type of an argument. May not be right.*/
export function typeofArg(arg:string):GAT {
	if(arg == "") return "invalid";
	if(arg == undefined) return "invalid";
	for(const [name, argKey] of GenericArgs.entries()){
		if(argKey.doNotGuess) continue;
		if(typeof argKey.validator == "function"){
			if(argKey.validator(arg)) return name;
		} else {
			for(const argString of argKey.validator){
				if(argString instanceof RegExp){
					if(argString.test(arg)) return name;
				} else {
					if(argString == arg) return name;
				}
			}
		}
	}
	return "invalid";
}

export function isArgValidForValidator(argToCheck:string, validator:ArgKey["validator"]):boolean {
	if(typeof validator == "function"){
		return validator(argToCheck);
	} else {
		for(const argString of validator){
			if(argString instanceof RegExp){
				if(argString.test(argToCheck)) return true;
			} else {
				if(argString == argToCheck) return true;
			}
		}
		return false;
	}
}

/**Returns if an arg is of a specified type. */
export function isArgValidForType(argToCheck:string, arg:GAT, checkAlsoAccepts:boolean = true):boolean {
	if(argToCheck == "") return false;
	if(argToCheck == undefined) return false;
	const argKey = GenericArgs.get(arg);
	if(!argKey) throw new Error(`Arg ${arg} is not a GAT`);

	//Check if the string is valid for any excluded arg
	for(const excludedArg of argKey.exclude){
		if(!isKey(GenericArgs, excludedArg)){
			throw new Error(`Arg AST is invalid: generic arg type ${arg} specifies exclude option ${excludedArg} which is not a known generic arg type`);
		}
		const excludedArgKey = GenericArgs.get(excludedArg)!;
		//If it is valid, return false
		if(isArgValidForValidator(argToCheck, excludedArgKey.validator)) return false;
	}

	//If function is not being called recursively
	if(checkAlsoAccepts){
		for(const otherType of argKey.alsoAccepts){
			if(!isKey(GenericArgs, otherType)){
				throw new Error(`Arg AST is invalid: generic arg type ${arg} specifies alsoAccepts option ${otherType} which is not a known generic arg type`);
			}
			//If the arg is valid for another accepted type, return true
			if(isArgValidForType(argToCheck, otherType, false)) return true;
		}
	}

	return isArgValidForValidator(argToCheck, argKey.validator);

}

export function isArgValidFor(str:string, arg:Arg):boolean {
	if(arg.isVariable)
		return isArgValidForType(str, "variable");
	else if(!arg.isGeneric)
		return str == arg.type;
	else
		return isArgValidForType(str, arg.type as GAT);
}