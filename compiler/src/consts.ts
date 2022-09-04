/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various constants.
*/

import { ArgKey, ArgType, Line, GAT, PreprocessedArgKey } from "./types.js";
import * as yup from "yup";

export const compilerMark = [
	`print "Made with mlogx"`,
	`print "github.com/BalaM314/mlogx/"`
];

export const settingsSchema = yup.object({
	name: yup.string().default("Untitled Project"),
	authors: yup.array().of(yup.string()).default(["Unknown"]),
	filename: yup.string().default("unknown.mlogx"),
	compilerOptions: yup.object({
		include: yup.array().of(yup.string()).default([]),
		verbose: yup.bool().default(false),
		removeComments: yup.bool().default(true),
		compileWithErrors: yup.bool().default(true),
		mode: yup.string().oneOf(["project", "single"]),
		prependFileName: yup.bool().default(true),
		checkTypes: yup.bool().default(true),
		removeUnusedJumpLabels: yup.bool().default(true),
		removeCompilerMark: yup.bool().default(false),
	}).required(),
	compilerConstants: yup.object().default({})
}).required();


export const buildingInternalNames: string[] = [
	"press", "smelter", "crucible", "kiln", "compressor",
	"weaver", "mixer", "melter", "separator", "disassembler",
	"pulverizer", "centrifuge", "incinerator", "wall",
	"door", "thruster", "mender", "projector", "dome",
	"mine", "conveyor", "junction", "sorter", "router",
	"distributor", "gate", "driver", "duct", "bridge",
	"pump", "conduit", "container", "tank", "node", "tower",
	"diode", "battery", "generator", "panel", "reactor",
	"drill", "extractor", "cultivator", "shard", "foundation",
	"nucleus", "vault", "unloader", "duo", "scatter",
	"scorch", "hail", "wave", "lancer", "arc", "parallax",
	"swarmer", "salvo", "segment", "tsunami", "fuse", "ripple",
	"cyclone", "foreshadow", "spectre", "meltdown", "center",
	"factory", "reconstructor", "point", "turret",
	"deconstructor", "constructor", "loader", "source",
	"void", "illuminator", "air", "ground", "pad",
	"accelerator", "message", "switch", "processor",
	"cell", "bank", "display"
];
export const buildingNameRegex = new RegExp(`^(${buildingInternalNames.map(el => `(${el})`).join("|")})[\\d]+$`);

export const GenericArgs = (
	//Typescript can be black magic sometimes
	//Use the provided values of indexes, but a specific type for the values.
	(<T extends string>(stuff: Map<T, PreprocessedArgKey>) =>
		new Map<T, ArgKey>(
			Array.from(stuff.entries())
				.map(([key, obj]) => [key, {
					alsoAccepts: obj.alsoAccepts ?? [],
					validator: obj.validator instanceof RegExp ? [ obj.validator ] : obj.validator,
					exclude: obj.exclude ?? []
				}])
		)) as <T extends string>(stuff: Map<T, PreprocessedArgKey>) => Map<T, ArgKey>
)(new Map([
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
	["type", {
		validator: (arg:string) => arg.startsWith("@") && !["@unit", "@thisx", "@thisy", "@this", "@ipt", "@links", "@time", "@tick", "@mapw", "@maph", "@counter"].includes(arg),
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
		alsoAccepts: ["number"]
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
		]
	}],
	["unitSortCriteria", {
		validator: ["distance", "health", "shield", "armor", "maxHealth"]
	}],
	["buildingGroup", {
		validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"]
	}],
	["lookupType", {
		validator: ["building", "unit", "fluid", "item"]
	}],
	["variable", {
		validator: [/^[^"@()[\]{}/\\:]+$/, "@counter"],
		exclude: ["number", "string", "boolean", "type", "building", "unit", "null", "ctype"]
	}],
	["any", {
		validator: /.+/,
		alsoAccepts: []
	}],
]));

export const requiredVarCode: {
	[index: string]: [string[], GAT];
} = {
	"cookie": [[
		`op mul cookie @thisx @maph`,
		`op add cookie @thisy cookie`
	], "number"]
};

export const maxLoops = 200;

export const processorVariables:{
	[name: string]: {
		variableType: ArgType;
		line: Line;
	}[]
} = {
	"@counter": [{
		variableType: "number",
		line: {
			text: "[processor variable]",
			lineNumber: 0
		}
	}]
};

export const maxLines = 999;
export const shortOperandMapping: {
	[shortop:string]: string;
} = {
	"+": "add",
	"-": "sub",
	"*": "mul",
	"/": "div",
	"//": "idiv",
	"**": "pow",
	"~=": "equal",
	"==": "strictEqual",
	"!=": "notEqual",
	"<>": "notEqual",
	"&&": "land",
	"<": "lessThan",
	"<=": "lessThanEq",
	">": "greaterThan",
	">=": "greaterThanEq",
	"<<": "shl",
	">>": "shr",
	"|": "or",
	"||": "or",
	"&": "and",
	"^": "xor",
};
