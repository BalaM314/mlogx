/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import chalk from "chalk";
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

export class Log {
	/**For debug information. */
	static debug(message:string){
		console.log(chalk.gray(`[DEBUG]\t${message}`));
	}
	/**Dumps objects */
	static dump(...objects:any[]){
		console.log(`[DEBUG]`, objects);
	}
	/**For general info. */
	static info(message:string){
		console.log(chalk.white(` [INFO]\t${message}`));
	}
	/**Warnings */
	static warn(message:string){
		console.warn(chalk.yellow(` [WARN]\t${message}`));
	}
	/**Errors */
	static err(message:string){
		console.error(chalk.redBright(`[ERROR]\t${message}`));
	}
	/**Fatal errors */
	static fatal(message:string){
		console.error(`[FATAL]\t${chalk.bgRed.white(message)}`);
	}
	/**Used by the program to announce what it is doing. */
	static announce(message:string){
		console.log(chalk.green(`${message}`));
	}
	/**Just prints a message without any formatting */
	static none(message:string){
		console.log(message);
	}

}
