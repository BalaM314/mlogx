/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains the generic args AST.
*/

import { MindustryContent, buildingNameRegex, shortOperandMapping } from "./consts.js";
import { PreprocessedArgKey, ArgKey } from "./types.js";

export const GenericArgs = (
///////warning: black magic below
	(<T extends string>(stuff: [T, PreprocessedArgKey][]) =>
		new Map<T, ArgKey>(
			stuff.map(([key, obj]) => [key, {
				alsoAccepts: obj.alsoAccepts ?? [],
				validator: obj.validator instanceof RegExp ? [ obj.validator ] : obj.validator,
				exclude: obj.exclude ?? [],
				doNotGuess: obj.doNotGuess ?? false
			}])
		)) as <T extends string>(stuff: [T, PreprocessedArgKey][]) => Map<T, ArgKey>
///////warning: black magic above
)([
	["number", {
		validator: [
			/^-?\d+((\.\d+)|(e-?\d+))?$/,
			"@thisx", "@thisy", "@ipt", "@links",
			"@time", "@tick", "@mapw", "@maph",
		],
		alsoAccepts: ["variable", "boolean"]
	}],
	["string", {
		validator: /^"(?:[^"]|(\\"))*"$/,
		alsoAccepts: ["variable"]
	}],
	["boolean", {
		validator: ["true", "false"],
		alsoAccepts: ["variable", "number"]
	}],
	["buildingType", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			MindustryContent.buildings.includes(arg.slice(1)),
		alsoAccepts: ["variable"]
	}],
	["fluidType", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			MindustryContent.fluids.includes(arg.slice(1)),
		alsoAccepts: ["variable"]
	}],
	["itemType", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			MindustryContent.items.includes(arg.slice(1)),
		alsoAccepts: ["variable"]
	}],
	["unitType", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			MindustryContent.units.includes(arg.slice(1)),
		alsoAccepts: ["variable"]
	}],
	["imageType", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			(MindustryContent.buildings.includes(arg.slice(1)) || MindustryContent.fluids.includes(arg.slice(1)) || MindustryContent.items.includes(arg.slice(1)) || MindustryContent.units.includes(arg.slice(1))),
		alsoAccepts: ["variable"]
	}],
	["senseable", {
		validator: (arg:string) =>
			arg.startsWith("@") && 
			(MindustryContent.senseables.includes(arg.slice(1))),
		alsoAccepts: ["variable"]
	}],
	["building", {
		validator: [buildingNameRegex, "@this"],
		alsoAccepts: ["variable"]
	}],
	["unit", {
		validator: ["@unit"],
		alsoAccepts: ["variable"]
	}],
	["null", {
		validator: ["null"],
		alsoAccepts: []
	}],
	["operandTest", {
		validator: [
			"equal", "notEqual", "strictEqual", "greaterThan",
			"lessThan", "greaterThanEq", "lessThanEq", "always"
		]
	}],
	["operandDouble", {
		validator: [
			"add", "sub", "mul", "div", "idiv", "mod", "pow",
			"equal", "notEqual", "land", "lessThan",
			"lessThanEq", "greaterThan", "greaterThanEq",
			"strictEqual", "shl", "shr", "or", "and",
			"xor", "min", "angle", "len", "noise",
		]
	}],
	["operandSingle", {
		validator: [
			"not", "max", "abs", "log", "log10",
			"floor", "ceil", "sqrt", "rand", "sin",
			"cos", "tan", "asin", "acos", "atan"
		]
	}],
	["jumpAddress", {
		validator: /^[^":]+$/,
		alsoAccepts: ["number"],
		doNotGuess: true,
	}],
	["invalid", {
		validator: []
	}],
	["ctype", {
		validator: /:[\w-$]+/
	}],
	["sOperandDouble", { //short (or symbol) operand double
		validator: (arg:string) => arg in shortOperandMapping
	}],
	["targetClass", {
		validator: [
			"any", "enemy", "ally", "player", "attacker",
			"flying", "boss", "ground"
		],
		doNotGuess: true,
	}],
	["unitSortCriteria", {
		validator: ["distance", "health", "shield", "armor", "maxHealth"],
		doNotGuess: true,
	}],
	["buildingGroup", {
		validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"],
		doNotGuess: true,
	}],
	["locateable", {
		validator: ["building", "ore", "spawn", "damaged"],
		doNotGuess: true,
	}],
	["lookupType", {
		validator: ["building", "unit", "fluid", "item"],
		doNotGuess: true,
	}],
	["variable", {
		validator: [/^@?[^"@[\]{}/\\:]+$/, "@counter"],
		//TODO see if this causes performance issues
		exclude: ["number", "string", "boolean", "building", "buildingType", "unitType", "itemType", "fluidType", "imageType", "senseable", "unit", "null", "ctype"]
	}],
	["any", {
		validator: /.+/,
		alsoAccepts: ["variable"],
		doNotGuess: true,
	}],
]);