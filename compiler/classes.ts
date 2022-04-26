/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { ArgType } from "./types";

/**Represents an argument(type) for a command.*/
export class Arg {
	constructor(
		public type:ArgType,
		public name:string = "WIP",
		public isOptional:boolean = false,
		public isGeneric:boolean = true,
		public isVariable:boolean = false
	){}
	toString(){
		if(!this.isGeneric)
			return `${this.type}`;
		if(this.isOptional)
			return `(${this.name}:${this.isVariable ? "*" : ""}${this.type})`;
		else
			return `[${this.name}:${this.isVariable ? "*" : ""}${this.type}]`;
	}
}

export class CompilerError extends Error {
	constructor(message?: string){
		super(...arguments);
		this.name = "CompilerError";
	}
}