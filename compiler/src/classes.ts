
/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various classes.
*/

import { splitLineIntoArguments } from "./funcs.js";
import { messages } from "./Log.js";
import { Line } from "./types.js";


export class CompilerError extends Error {
	constructor(message:string){
		super(message);
		this.name = "CompilerError";
	}
	static throw<ID extends keyof typeof messages, MData extends (typeof messages)[ID]>(
		messageID:ID, data:Parameters<MData["for"]>[0]
	){
		const message = messages[messageID] as MData;
		//cursed
		throw new this(message.for(data as never));
	}
}

/**Represents a compiled statement. */
export class Statement {
	readonly args: string[];
	// commandDefinition: CommandDefinition | null = null;
	constructor(public readonly text:string, public readonly sourceFilename:string, public readonly sourceLineNumber:number, public readonly sourceText:string, public readonly cleanedSourceText:string){
		this.args = splitLineIntoArguments(text);
	}
	static fromLines(text:string, source:Line, cleanedSource:Line){
		return new Statement(text, source.sourceFilename, source.lineNumber, source.text, cleanedSource.text);
	}
	sourceLine(){
		return {
			lineNumber: this.sourceLineNumber,
			sourceFilename: this.sourceFilename,
			text: this.sourceText
		};
	}
	cleanedSourceLine(){
		return {
			lineNumber: this.sourceLineNumber,
			sourceFilename: this.sourceFilename,
			text: this.cleanedSourceText
		};
	}
}
