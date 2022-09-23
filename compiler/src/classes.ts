
/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains various classes.
*/

import { messages } from "./Log.js";


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