
/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various classes.
*/

import { CommandDefinition } from "./commands.js";
import { getCommandDefinitions, splitLineIntoTokens } from "./funcs.js";
import { messages } from "./Log.js";
import { Line } from "./types.js";


export class CompilerError extends Error {
	constructor(message:string){
		super(message);
		this.name = "CompilerError";
	}
	static throw<ID extends keyof typeof messages, MData extends (typeof messages)[ID]>(
		messageID:ID, data:Parameters<MData["for"]>[0]
	):never {
		const message = messages[messageID] as MData;
		//cursed
		throw new this(message.for(data as never));
	}
}

//is this the best name?
interface ProcessedLine {
	text: string;
	tokens: string[];
	commandDefinitions: CommandDefinition[];
}

/**Represents a compiled statement. */
export class Statement implements ProcessedLine {
	readonly cleanedSource: ProcessedLine;
	readonly modifiedSource: ProcessedLine;
	readonly compiled: ProcessedLine;
	readonly tokens: string[];
	readonly commandDefinitions: CommandDefinition[];
	/*cleanedSource: {
		text: string;
		args: string[];
		commandDefinitions: CommandDefinition[];
		lineNumber: number;
		sourceFilename: string;
	};*/
	constructor(
		public readonly text:string, public readonly sourceText:string, cleanedSourceText:string, modifiedSourceText:string,
		public readonly sourceFilename:string,
		public readonly sourceLineNumber:number,
	){
		this.cleanedSource = {
			text: cleanedSourceText,
			tokens: splitLineIntoTokens(cleanedSourceText),
			commandDefinitions: getCommandDefinitions(cleanedSourceText)
		};
		this.modifiedSource = {
			text: modifiedSourceText,
			tokens: splitLineIntoTokens(modifiedSourceText),
			commandDefinitions: getCommandDefinitions(modifiedSourceText)
		};
		this.compiled = {
			text,
			tokens: splitLineIntoTokens(text),
			commandDefinitions: getCommandDefinitions(text)
		};
		this.tokens = this.compiled.tokens;
		this.commandDefinitions = this.compiled.commandDefinitions;
	}
	static fromLines(text:string, source:Line, cleanedSource:Line){
		return new Statement(text, source.text, cleanedSource.text, cleanedSource.text, source.sourceFilename, source.lineNumber);
	}
	// text(){ return this.compiled.text; }
	// args(){ return this.compiled.args; }
	// commandDefinitions(){ return this.compiled.commandDefinitions; }
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
			text: this.cleanedSource.text,
		};
	}
	modifiedSourceLine(){
		return {
			lineNumber: this.sourceLineNumber,
			sourceFilename: this.sourceFilename,
			text: this.modifiedSource.text,
		};
	}
}
