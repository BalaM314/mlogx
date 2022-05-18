/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { ArgType, GenericArgType, Settings } from "./types.js";

export const compilerMark = 
`print "Made with mlogx"
print "github.com/BalaM314/mlogx/"`;

export const defaultSettings:Settings = {
	name: "",
	authors: [],
	compilerOptions: {
		include: [],
		removeComments: true,
		compileWithErrors: true,
		mode: "single",
		prependFileName: true,
		checkTypes: true,
	},
	compilerVariables: {
		
	}
};

export const requiredVarCode: {
	[index: string]: string[];
} = {
	"cookie": [
		`op mul cookie @thisx @maph`,
		`op add cookie @thisy cookie`
	]
}

export const processorVariables:{
	[name: string]: {
		variableType: ArgType;
		line: string;
	}[]
} = {
	"@counter": [{
		variableType: GenericArgType.number,
		line: "[processor variable]"
	}]
};
