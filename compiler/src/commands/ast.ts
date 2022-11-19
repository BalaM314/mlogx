/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains two massive command ASTs.
*/


import { GenericArgs, typeofArg } from "../args.js";
import { CompilerError } from "../classes.js";
import { maxLoops, MindustryContent, shortOperandMappings } from "../consts.js";
import { Log } from "../Log.js";
import {
	addNamespacesToLine, getCommandDefinition, impossible, isKey, range,replaceCompilerConstants,
	splitLineIntoArguments
} from "../funcs.js";
import { hasDisabledIf, hasElement, topForLoop } from "../stack_elements.js";
import { CompiledLine, PortingMode } from "../types.js";
import { processCommands, processCompilerCommands } from "./funcs.js";


//welcome to AST hell
/** Contains the data for all commands.*/
export const commands = processCommands({
	call: [{
		args: "function:variable",
		replace: [
			"op add @counter _stack1 1",
			"jump %1 always"
		],
		description: "Calls (function)."
	}],
	increment: [{
		args: "variable:variable amount:number",
		replace: ["op add %1 %1 %2"],
		description: "Adds (amount) to (variable)."
	}],
	return: [{
		args: "",
		replace: ["set @counter _stack1"],
		description: "Returns to the main program from a function."
	}],
	throw: [{
		args: "error:string",
		replace: [
			"set err %1",
			"jump err always"
		],
		description: "Throws (error). Requires you to include \"err\"."
	}],
	uflag: [{
		args: "type:unitType",
		replace: [
			"set unit_type %1",
			"op add @counter _stack1 1",
			"jump flag_unit always",
		],
		description: "Binds and flags a unit of type (type). Requires you to include \"flag_unit\"."
	}],


	read: [{
		args: "output:*number cell:building index:number",
		description: "Reads a value at index (index) from memory cell (cell) and stores it in (output)."
	}],
	write: [{
		args: "value:number cell:building index:number",
		description: "Writes (value) at index (index) to memory cell (cell)."
	}],
	draw: [
		{
			args: "clear r:number g:number b:number",
			description: "Clears the display, replacing it with color (r,g,b)."
		},{
			args: "color r:number g:number b:number a:number",
			description: "Sets the draw color to (r,g,b)."
		},{
			args: "col packedColor:packedColor",
			description: "Sets the draw color using packedColor"
		},{
			args: "stroke width:number",
			description: "Sets the stroke width to (width)."
		},{
			args: "line x1:number y1:number x2:number y2:number",
			description: "Draws a line between (x1, y1) and (x2, y2)."
		},{
			args: "rect x:number y:number width:number height:number",
			description: "Draws a rectangle with lower right corner at (x,y) with width (width) and height (height)."
		},{
			args: "lineRect x:number y:number width:number height:number",
			description: "Draws the outline of a rectangle with lower right corner at (x,y) with width (width) and height (height)."
		},{
			args: "poly x:number y:number sides:number radius:number rotation:number",
			description: "Draws a (regular) polygon centered at (x,y) with (sides) sides and a radius of (radius)."
		},{
			args: "linePoly x:number y:number sides:number radius:number rotation:number",
			description: "Draws the outline of a polygon centered at (x,y) with (sides) sides and a radius of (radius)."
		},{
			args: "triangle x1:number y1:number x2:number y2:number x3:number y3:number",
			description: "Draws a triangle between the points (x1, y1), (x2, y2), and (x3, y3)."
		},{
			args: "image x:number y:number image:imageType size:number rotation:number",
			description: "Displays an image of (image) centered at (x,y) with size (size) and rotated (rotation) degrees."
		},
	],
	drawflush: [{
		args: "display:building",
		description: "Flushes queued draw instructions to (display)."
	}],
	print: [{
		args: "message:any",
		description: "Prints (message) to the message buffer."
	}],
	printflush: [
		{
			args: "messageblock:building",
			description: "Flushes queued print instructions to (messageblock)."
		},{
			args: "null",
			description: "Clears queued print instructions."
		}
	],
	getlink: [{
		args: "output:*building n:number",
		description: "Gets the (n)th linked building and stores it in (building). Useful when looping over all buildings."
	}],
	control: [
		{
			args: "enabled building:building enabled:boolean",
			description: "Sets whether (building) is enabled."
		},{
			args: "shoot turret:building x:number y:number shoot:boolean",
			description: "Sets the shoot position of (turret) to (x,y) and shoots if (shoot)."
		},{
			args: "shootp turret:building unit:unit shoot:boolean",
			description: "Sets the shoot position of (turret) to (unit) with velocity prediction and shoots if (shoot)."
		},{
			args: "config building:building config:any",
			description: "Sets the config of (building) to (config)."
		},{
			args: "color illuminator:building r:number g:number b:number",
			description: "Sets the color of (illuminator) to (r,g,b)."
		},
	],
	radar: [
		{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
			description: "Finds a unit of specified type within the range of (turret) and stores it in (output).",
			port(args, mode) {
				if(mode >= PortingMode.shortenSyntax && ((args[1] == args[2] && args[2] == args[3]) || (args[2] == "any" && args[3] == "any")))
					return `${args[0]} ${args[1]} ${args[4]} ${args[5]} ${args[6]} ${args[7]}`;
				else
					return args.join(" ");
			},
		},{
			args: "targetClass:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
			description: "Finds a unit of specified type within the range of (turret) and stores it in (output). Shortened form of the regular radar instruction.",
			replace: [
				"radar %1 any any %2 %3 %4 %5"
			]
		},{
			args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
			description: "Finds a unit of specified type within the range of (turret) and stores it in (output). Shortened form of the regular radar instruction with sortOrder and turret swapped.",
			replace: [
				"radar %1 any any %2 %4 %3 %5"
			]
		},{
			args: "targetClass:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
			description: "Finds a unit of specified type within the range of (turret) and stores it in (output). sortOrder and turret are swapped.",
			replace: [
				"radar %1 %2 %3 %4 %6 %5 %7"
			]
		},
	],
	sensor: [
		{
			args: "output:*any building:building value:senseable",
			description: "Gets information about (building) and stores it in (output), does not need to be linked or on the same team.",
			port(args, mode) {
				if(args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
					return `sensor ${args[1]}`;
				else
					return args.join(" ");
			},
		},{
			args: "output:*any unit:unit value:senseable",
			description: "Gets information about (unit) and stores it in (output), does not need to be on the same team.",
			port(args, mode) {
				if(args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
					return `sensor ${args[1]}`;
				else
					return args.join(" ");
			},
		},{
			args: "thing.property:*any",
			replace: (args:string[]) => {
				if(args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i)){
					const [, target, property] = args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i)!;
					if(target == null || property == null) throw new Error("Impossible.");
					if(!MindustryContent.senseables.includes(property)) throw new CompilerError(`Property ${property} is not senseable.`);
					return [`sensor ${args[1]} ${target == "unit" ? "@unit" : target} @${property}`];
				} else {
					throw new CompilerError(`Invalid command, ${args[1]} must be of type thing.property and cannot contain certain special characters`);
				}
			},
			description: "Gets information about a unit or building and stores it in (thing.property), does not need to be linked or on the same team. Example usage: sensor player.shootX will read the player's shootX into the variable player.shootX"
		}
	],
	set: [
		{
			args: "variable:*any value:any",
			description: "Sets the value of (variable) to (value).",
			getVariablesDefined: (args) => [[args[1], typeofArg(args[2]) == "variable" ? "any" : typeofArg(args[2])]]
		},{
			args: "variable:*any type:ctype value:any",
			description: "Sets the value of (variable) to (value), and the type of (variable) to (type).",
			replace: (args:string[]) => {
				const type = args[2].slice(1);
				if(isKey(GenericArgs, type)){
					return [`set ${args[1]} ${args[3]}`];
				} else {
					throw new CompilerError(`Invalid type "${type}", valid types are ${Object.keys(GenericArgs).join(", ")}`);
				}
			},
			getVariablesDefined: (args) => {
				const type = args[2].slice(1);
				if(isKey(GenericArgs, type)){
					return [[args[1], args[2].slice(1)]];
				} else {
					throw new CompilerError(`Invalid type "${type}", valid types are ${Object.keys(GenericArgs).join(", ")}`);
				}
			}
		},{
			args: "variable:*number arg1:number operand:sOperandDouble arg2:number",
			description: "Alternative syntax for the op statement: sets (variable) to (arg1) (operand) (arg2). Example: set reactor.tooHot reactor.heat => 0.1 will compile to op greaterThanEq reactor.tooHot reactor.heat 0.1",
			replace: (args:string[]) => [`op ${shortOperandMappings.double[args[3]]} ${args[1]} ${args[2]} ${args[4]}`]
		}
	],
	op: [
		{
			args: "operand:operandSingle output:*number arg1:number zero:0?",
			description: "Sets (output) to (operand) (arg1).",
			replace: [ "op %1 %2 %3 0" ],
			port(args, mode){
				if(mode >= PortingMode.removeZeroes){
					if(args[4] == "0") args.splice(4, 1);
				}
				if(mode >= PortingMode.shortenSyntax){
					if(args[2] == args[3]) return `op ${args[1]} ${args[2]}`;
				}
				return args.join(" ");
			},
		},{
			args: "operand:operandDouble output:*number arg1:number arg2:number",
			description: "Sets (output) to (arg1) (operand) (arg2).",
			port(args, mode){
				if(mode >= PortingMode.shortenSyntax){
					if(args[2] == args[3]) return `op ${args[1]} ${args[2]} ${args[4]}`;
				}
				return args.join(" ");
			},
		},{
			args: "operand:operandDouble output:*number arg1:number",
			description: "Sets (output) to (output) (operand) (arg1). Useful for doubling a number, or adding 1 to it.",
			replace: [ "op %1 %2 %2 %3" ]
		},{
			args: "operand:operandSingle arg1:*number",
			description: "Sets (arg1) to (operand) (arg1). Example: `op abs xDiff`",
			replace: [ "op %1 %2 %2 0" ]
		}
	],
	wait: [{
		args: "seconds:number",
		description: "Waits for (seconds) seconds."
	}],
	lookup: [
		{
			args: "item output:*itemType n:number",
			description: "Looks up the (n)th item and stores it in (output)."
		},{
			args: "block output:*buildingType n:number",
			description: "Looks up the (n)th building and stores it in (output)."
		},{
			args: "liquid output:*liquidType n:number",
			description: "Looks up the (n)th fluid and stores it in (output)."
		},{
			args: "unit output:*unitType n:number",
			description: "Looks up the (n)th unit and stores it in (output)."
		},
	],
	//packcolor output r g b a
	packcolor:[{
			args: "output:packedColor r:number g:number a:number",
			description: "compresses [0-1]RGBA values into one singular number (packedColor)"
	}],
	end: [{
		args: "",
		description: "Goes back to the start."
	}],
	stop: [{
		args: "",
		description: "halts the processor from running"
	}],
	jump: [
		{
			args: "jumpAddress:jumpAddress always zero:0? zero:0?",
			description: "Jumps to (jumpAddress).",
			replace: [ "jump %1 always 0 0" ],
			port(args, mode){
				if(mode >= PortingMode.shortenSyntax){
					return `jump ${args[1]}`;
				} else if(mode >= PortingMode.removeZeroes){
					return `jump ${args[1]} always`;
				}
				return args.join(" ");
			}
		},{
			args: "jumpAddress:jumpAddress operand:operandTest var1:any var2:any",
			description: "Jumps to (jumpAddress) if (var1) (operand) (var2).",
			port(args, mode){
				if(mode >= PortingMode.shortenSyntax){
					if(args[2] == "always") return `jump ${args[1]}`;
				} else if(mode >= PortingMode.removeZeroes){
					if(args[2] == "always") return `jump ${args[1]} always`;
				}
				return args.join(" ");
			},
		},{
			args: "jumpAddress:jumpAddress",
			description: "Jumps to (jumpAddress).",
			replace: [ "jump %1 always 0 0" ]
		},{
			args: "jumpAddress:jumpAddress var1:any operand:sOperandTest var2:any",
			description: "Alternative jump syntax: Jumps to (jumpAddress) if (var1) (operand) (var2). Uses short operands like <= instead of lessThanEq.",
			replace: (args:string[]) => [`jump ${args[1]} ${shortOperandMappings.test[args[3]]} ${args[2]} ${args[4]}`]
		},
	],
	ubind: [
		{
			args: "unitType:unitType",
			description: "Binds a unit of (unitType). May return dead units if no live ones exist."
		},{
			args: "null:null",
			description: "Unbinds the current unit."
		},{
			args: "unit:unit",
			description: "Binds a specific unit."
		},
	],
	ucontrol: [
		{
			args: "idle",
			description: "Tells the bound unit to stop moving, but continue other actions."
		},{
			args: "stop",
			description: "Tells the bound unit to stop all actions."
		},{
			args: "move x:number y:number",
			description: "Tells the bound unit to move to (x,y). Does not wait for the unit to reach."
		},{
			args: "approach x:number y:number radius:number",
			description: "Tells the bound unit to approach (x,y) but stay (radius) away. Does not wait for the unit to reach."
		},{
			args: "boost enable:boolean",
			description: "Tells the bound unit to boost or not boost."
		},{
			args: "pathfind",
			description: "Tells the bound unit to follow its normal AI."
		},{
			args: "target x:number y:number shoot:boolean",
			description: "Tells the bound unit to target/shoot (x,y).\nWill not shoot if the position is outside the unit's range."
		},{
			args: "targetp unit:unit shoot:boolean",
			description: "Tells the bound unit to target/shoot a unit.\nWill not shoot if the position is outside the unit's range."
		},{
			args: "itemDrop building:building amount:number",
			description: "Tells the bound unit to drop at most (amount) items to (building)."
		},{
			args: "itemTake building:building item:itemType amount:number",
			description: "Tells the bound unit to take at most (amount) of (item) from (building)."
		},{
			args: "payDrop",
			description: "Tells the bound unit to drop its payload."
		},{
			args: "payTake takeUnits:boolean",
			description: "Tells the bound unit to pick up a payload and whether or not to grab units."
		},{
			args: "payEnter",
			description: "Tells the bound unit to enter a building(usually a reconstructor)."
		},{
			args: "mine x:number y:number",
			description: "Tells the unit to mine at (x,y)."
		},{
			args: "flag flag:number",
			description: "Sets the flag of the bound unit."
		},{
			args: "build x:number y:number buildingType:buildingType rotation:number config:any",
			description: "Tells the unit to build (block) with (rotation) and (config) at (x,y)."
		},{
			args: "getBlock x:number y:number buildingType:*buildingType building:*building",
			description: "Gets the building type and building at (x,y) and outputs to (buildingType) and (building). Required if you want to get the building object for a building on another team."
		},{
			args: "within x:number y:number radius:number output:*boolean",
			description: "Checks if the unit is within (radius) tiles of (x,y) and outputs to (output)."
		},
	],
	uradar: [
		{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*unit",
			description: "Finds a unit of specified type within the range of the bound unit and stores it in (output).",
			replace: [
				"uradar %1 %2 %3 %4 0 %5 %6"
			]
		},{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sillyness:0 sortOrder:number output:*unit",
			description: "Today I learned that the default signature of uradar has a random 0 that doesn't mean anything.",
			port(args, mode) {
				if(mode >= PortingMode.shortenSyntax && ((args[1] == args[2] && args[2] == args[3]) || (args[2] == "any" && args[3] == "any")))
					return `${args[0]} ${args[1]} ${args[4]} ${args[6]} ${args[7]}`;
				else if(mode >= PortingMode.removeZeroes)
					return `${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} ${args[6]} ${args[7]}`;
				else
					return args.join(" ");
			},
		},{
			args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*unit",
			description: "Finds a unit of specified type within the range of the bound unit and stores it in (output). Sorter version of the regular uradar instruction.",
			replace: [
				"uradar %1 any any %2 0 %3 %4"
			]
		},
	],
	ulocate: [
		{
			args: "ore ore:itemType outX:*number outY:*number found:*boolean",
			description: "Finds an (ore) ore near the bound unit and stores its position in (outX, outY).",
			replace: ["ulocate ore core _ %2 %3 %4 %5 _"]
		},{
			args: "spawn outX:*number outY:*number found:*boolean",
			description: "Finds an enemy spawnpoint near the bound unit and stores its position in (outX, outY).",
			replace: ["ulocate spawn core _ _ %2 %3 %4 _"]
		},{
			args: "damaged outX:*number outY:*number found:*boolean building:*building",
			description: "Finds a damaged building near the bound unit and stores its position in (outX, outY).",
			replace: ["ulocate damaged core _ _ %2 %3 %4 %5"]
		},{
			args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
			description: "Finds a building of specified group near the bound unit, storing its position in (outX, outY) and the building in (building) if it is on the same team.",
			replace: ["ulocate building %2 %3 _ %4 %5 %6 %7"]
		},{
			args: "oreOrSpawnOrAmogusOrDamagedOrBuilding:locateable buildingGroup:buildingGroup enemy:boolean ore:itemType outX:*number outY:*number found:*boolean building:*building",
			description: "The wack default ulocate signature, included for compatibility.",
			port(args, mode){
				if(mode >= PortingMode.shortenSyntax){
					switch(args[1]){
						case "ore":
							return `ulocate ore ${args[4]} ${args[5]} ${args[6]} ${args[7]}`;
						case "spawn":
							return `ulocate spawn ${args[5]} ${args[6]} ${args[7]}`;
						case "damaged":
							return `ulocate damaged ${args[5]} ${args[6]} ${args[7]} ${args[8]}`;
						case "building":
							return `ulocate building ${args[2]} ${args[3]} ${args[5]} ${args[6]} ${args[7]} ${args[8]}`;
						default:
							Log.printMessage("statement port failed", {
								name: args[0], statement: args.join(" ")
							});
					}
				}
				return args.join(" ");
			},
		}
	],
//world processor exclusive (data from 139)
	//getblock [floor, ore, block, building] result x y
	getblock: [
		{
		//idk if floor type is a thing here
			args: "floor output:*floorType x:number y:number",
			description: "outputs the floor type at coordinates (x,y)"
		},{
		//ore as well...
			args: "ore output:*oreType x:number y:number",
			description: "outputs the ore type at coordinates (x,y)"	
		},{
		//block = buildingType in mindus, TIL
			args: "block output:*buildingType x:number y:number",
			description: "outputs the building type at coordinates (x,y)"	
		},{
			args: "building output:building x:number y:number",
			description: "outputs the building at coordinates (x,y)"	
		}
	],
	//setblock [floor, ore, block] *type x y @team rotation
	setblock: [
		{
			args: "floor floorType:*floorType x:number y:number",
			description: "sets the floor type at coordinates (x,y)"
		},{
			args: "ore oreType:*oreType x:number y:number",
			description: "sets the ore type at coordinates (x,y)"	
		},{
			args: "block buildingType:*buildingType x:number y:number team:*team rotation:number",
			description: "sets the block at coordinates (x,y) with a team and a counter clockwise rotation starting at the right [0 - 3]"	
		}
	],
	//spawn @unitType x y rotation-angle @team unitReference
	spawn: [{
		args: "type:unitType x:number y:number rotation:number team:team output:*unit",
		description: "Spawns a (type) unit at (x,y) with rotation (rotation) and team (team), storing it in (output)."
	}],
	status: [
		{
			args: "false effect:statusEffect unit:unit duration:number",
			description: "Applies (effect) to (unit) for (duration) seconds."
		},{
			args: "true effect:statusEffect unit:unit",
			description: "Removes (effect) from (unit)."
		},{
			args: "apply effect:statusEffect unit:unit duration:number",
			description: "Applies (effect) to (unit) for (duration) seconds.",
			replace: ["status false %2 %3 %4"]
		},{
			args: "clear effect:statusEffect unit:unit",
			description: "Removes (effect) from (unit).",
			replace: ["status true %2 %3"]
		},
	],
	spawnwave: [{
		args: "x:number y:number natural:boolean",
		description: "Spawns a wave at (x,y)."
	}],
	setrule: [
		{
			args: "rule:rule value:number",
			description: "Sets (rule) to (value)."
		},{
			args: "mapArea x:number y:number width:number height:number",
			description: "Sets the map area."
		},
	],
	message: [
		{
			args: "notify",
			description: "Flushes the message buffer to a notification."
		},{
			args: "announce duration:number",
			description: "Flushes the message buffer to an announcement for (duration) seconds."
		},{
			args: "toast duration:number",
			description: "Flushes the message buffer to a toast for (duration) seconds."
		},{
			args: "mission",
			description: "Flushes the message buffer to the mission text."
		},
	],
	//cutscene [pan(x, y, speed) zoom(level) stop)] 0 (random zero :/)
	cutscene: [
		{
			args: "pan x:number y:number speed:number",
			description: "pans to coordinates (x,y) at a certain (speed)."
		},{
			args: "zoom level:number",
			description: "Flushes the message buffer to a toast for (duration) seconds."
		},{
			args: "stop",
			description: "Flushes the message buffer to the mission text."
		},
	],
	//explosion @team x y radius dmg isAirHurt isGroundHurt isPierce
	explosion: [{
		args: "team:team x:number y:number radius:number damage:number affectsAir:boolean affectsGround:boolean isPiercing:boolean",
		description: "creates an explosion at coordinates (x,y), damages a specific (team), whether or not if it hits air or ground, and if it pierces"
	}],
	setrate: [{
		args: "ipt:number",
		description: "Sets the instructions per tick to (ipt)"
	}],
	fetch: [
		{
			args: "thing:fetchableCount output:*number",
			description: "Fetches (thing) and stores it in (output)."
		}
	],
	getflag: [{
		args: "output:*any flag:string",
		description: "Gets the value of flag (flag) and stores it in (output)."
	}],
	setflag: [{
		args: "flag:string value:any",
		description: "Sets the value of flag (flag) to (value)"
	}],

});

export const compilerCommands = processCompilerCommands({
	'&for': {
		stackElement: true,
		overloads: [
			{
				args: "variable:variable in lowerBound:number upperBound:number {",
				description: "&for in loops allow you to emit the same code multiple times but with a number incrementing. (variable) is set as a compiler constant and goes from (lowerBound) through (upperBound) inclusive, and the code between the bracket is emitted once for each value..",
				onbegin({line}){
					const args = splitLineIntoArguments(line.text);
					const lowerBound = parseInt(args[3]);
					const upperBound = parseInt(args[4]);
					if(isNaN(lowerBound))
						throw new CompilerError(`Invalid for loop syntax: lowerBound(${lowerBound}) is invalid`);
					if(isNaN(upperBound))
						throw new CompilerError(`Invalid for loop syntax: upperBound(${upperBound}) is invalid`);
					if(lowerBound < 0)
						throw new CompilerError(`Invalid for loop syntax: lowerBound(${upperBound}) cannot be negative`);
					if((upperBound - lowerBound) > maxLoops)
						throw new CompilerError(`Invalid for loop syntax: number of loops(${upperBound - lowerBound}) is greater than 200`);
					return {
						element: {
							type: "&for",
							elements: range(lowerBound, upperBound, true),
							variableName: args[1],
							loopBuffer: [],
							line
						},
						compiledCode: []
					};
				},
				onpostcompile({compiledOutput, stack}){
					topForLoop(stack)?.loopBuffer.push(...compiledOutput);
					return {
						modifiedOutput: []
					};
				},
				onend({removedElement, stack}){
					const compiledCode:CompiledLine[] = [];
					for(const el of removedElement.elements){
						compiledCode.push(
							...removedElement.loopBuffer.map(line => [
								replaceCompilerConstants(line[0], new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")),
								{
									text: replaceCompilerConstants(line[1].text, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")),
									lineNumber: line[1].lineNumber,
									sourceFilename: line[1].sourceFilename
								},
								line[2]
							] as CompiledLine)
						);
					}
					return { compiledCode };
				},
			},{
				args: "variable:variable of ...elements:any {",
				description: "&for of loops allow you to emit the same code multiple times but with a value changed. (variable) is set as a compiler constant and goes through each element of (elements), and the code between the brackets is emitted once for each value.",
				onbegin({line}) {
					const args = splitLineIntoArguments(line.text);
					return {
						element: {
							type: "&for",
							elements: args.slice(3, -1),
							variableName: args[1],
							loopBuffer: [],
							line
						},
						compiledCode: []
					};
				},
				onpostcompile({compiledOutput, stack}) {
					topForLoop(stack)?.loopBuffer.push(...compiledOutput);
					return {
						modifiedOutput: []
					};
				},
				onend({removedElement, stack}){
					const compiledCode:CompiledLine[] = [];
					for(const el of removedElement.elements){
						compiledCode.push(
							...removedElement.loopBuffer.map(line => [
								replaceCompilerConstants(line[0], new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")),
								{
									text: replaceCompilerConstants(line[1].text, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")),
									lineNumber: line[1].lineNumber,
									sourceFilename: line[1].sourceFilename
								},
								line[2]
							] as CompiledLine)
						);
					}
					return { compiledCode };
				},
			}
		]
	},
	"&if": {
		stackElement: true,
		overloads: [{
			args: "variable:boolean {",
			description: "&if statements allow you to emit code only if a compiler const is true.",
			onbegin({line}) {
				const args = splitLineIntoArguments(line.text);
				let isEnabled = false;
				if(args.length == 3){
					if(!isNaN(parseInt(args[1]))){
						isEnabled = !! parseInt(args[1]);
					} else if(args[1] == "true"){
						isEnabled = true;
					} else if(args[1] == "false"){
						isEnabled = false;
					} else {
						Log.printMessage("if statement condition not boolean", {condition:args[1]});
						isEnabled = true;
					}
				}
				return {
					element: {
						type: "&if",
						line,
						enabled: isEnabled
					},
					compiledCode: []
				};
			},
			onpostcompile({compiledOutput, stack}) {
				if(hasDisabledIf(stack)){
					return {
						modifiedOutput: []
					};
				} else {
					return {
						modifiedOutput: compiledOutput
					};
				}
			},
		}]
	},
	'namespace': {
		stackElement: true,
		overloads: [
			{
				args: "name:string {",
				description: "[WIP] Prepends _(name)_ to all variable names inside the block to prevent name conflicts. Doesn't work that well.",
				onbegin({line}) {
					const args = splitLineIntoArguments(line.text);
					return {
						element: {
							name: args[1],
							type: "namespace",
							line
						},
						compiledCode: []
					};
				},
				onpostcompile({compiledOutput, stack}) {
					return {
						modifiedOutput: compiledOutput.map(line => {
							const commandDefinition = getCommandDefinition(line[0]);
							if(!commandDefinition){
								impossible();
							}
							return [addNamespacesToLine(splitLineIntoArguments(line[0]), commandDefinition, stack), line[1], line[2]];
						})
					};
				},
			}
		]
	}
});