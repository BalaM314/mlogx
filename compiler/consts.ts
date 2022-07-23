/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { ArgType, GAT, Line, Settings } from "./types.js";

export const compilerMark = [
	`print "Made with mlogx"`,
	`print "github.com/BalaM314/mlogx/"`
];

export const defaultSettings:Settings = {
	name: "",
	authors: [],
	compilerOptions: {
		include: [],
		verbose: false,
		removeComments: true,
		compileWithErrors: true,
		mode: "single",
		prependFileName: true,
		checkTypes: true,
		removeUnusedJumpLabels: false
	},
	compilerConstants: {
		
	}
};

export const requiredVarCode: {
	[index: string]: string[];
} = {
	"cookie": [
		`op mul cookie @thisx @maph`,
		`op add cookie @thisy cookie`
	]
};

export const processorVariables:{
	[name: string]: {
		variableType: ArgType;
		line: Line;
	}[]
} = {
	"@counter": [{
		variableType: GAT.number,
		line: {
			text: "[processor variable]",
			lineNumber: 0
		}
	}]
};

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
