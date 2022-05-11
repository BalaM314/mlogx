/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import { processCommands } from "./funcs.js";
import { CommandDefinitions } from "./types.js";

//welcome to AST hell
/** Contains the arguments for all types.*/
export const commands: CommandDefinitions = processCommands({
	call: [{
		args: "function:function",
		replace: [
			"set _stack1 @counter",
			"op add _stack1 _stack1 2",
			"jump %1 always"
		],
		description: "Calls (function)."
	}],
	increment: [{
		args: "variable:variable amount:number",
		replace: ["op add %1 %1 %2"],
		description: "Adds a (amount) to (variable)."
	}],
	return: [{
		args: "",
		replace: ["set @counter _stack1"],
		description: "Returns to the main program from a function."
	}],
	throw: [{
		args: "error:string",
		replace: [
			"set _err %1",
			"jump _err always"
		],
		description: "Throws (error)."
	}],
	uflag: [{
		args: "type:type",
		replace: [
			"set _unit_type %1",
			"set _stack1 @counter",
			"op add _stack1 _stack1 2",
			"jump _flag_unit always",
		],
		description: "Binds and flags a unit of type (type)."
	}],
	read: [{
		args: "output:*number cell:building index:number",
		description: "Reads a value at index (index) from memory cell (cell) and outputs to (output)."
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
			args: "stroke width:number",
			description: "Sets the stroke width to (width)."
		},{
			args: "line x1:number y1:number x2:number y2:number",
			description: "Draws a line between (x1, y1) and (x2, y2)."
		},{
			args: "rect x:number y:number width:number height:number",
			description: "Draws a rectangle with lower right corner at (x,y) with width (width) and height (height)."
		},{
			args: "linerect x:number y:number width:number height:number",
			description: "Draws the outline of a rectangle with lower right corner at (x,y) with width (width) and height (height)."
		},{
			args: "poly x:number y:number sides:number radius:number rotation:number",
			description: "Draws a (regular) polygon centered at (x,y) with (sides) sides and a radius of (radius)."
		},{
			args: "linepoly x:number y:number sides:number radius:number rotation:number",
			description: "Draws the outline of a polygon centered at (x,y) with (sides) sides and a radius of (radius)."
		},{
			args: "triangle x1:number y1:number x2:number y2:number x3:number y3:number",
			description: "Draws a triangle between the points (x1, y1), (x2, y2), and (x3, y3)."
		},{
			args: "image x:number y:number image:type size:number rotation:number",
			description: "Displays an image of (image) centered at (x,y) with size (size) and rotated (rotation) degrees."
		},
	],
	print: [{
		args: "message:valid",
		description: "Prints (message) to the message buffer."
	}],
	drawflush: [{
		args: "display:building",
		description: "Flushes queued draw instructions to (display)."
	}],
	printflush: [{
		args: "messageblock:building",
		description: "Flushes queued print instructions to (messageblock)"
	}],
	getlink: [{
		args: "output:*building n:number",
		description: "Gets the (n)th linked building. Useful when looping over all buildings."
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
			args: "config building:building config:valid",
			description: "Sets the config of (building) to (config)."
		},{
			args: "color illuminator:building r:number g:number b:number",
			description: "Sets the color of (illuminator) to (r,g,b)."
		},
	],
	radar: [
		{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
			description: "Finds units of specified type within the range of (turret)."
		},{
			args: "targetClass:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
			description: "Finds units of specified type within the range of (turret).",
			replace: [
				"radar %1 %1 %1 %2 %3 %4 %5"
			]
		},
	],
	sensor: [
		{
			args: "output:*any building:building value:type",
			description: "Gets information about (building) and outputs to (output), does not need to be linked or on the same team."
		},{
			args: "output:*any unit:unit value:type",
			description: "Gets information about (unit) and outputs to (output), does not need to be on the same team."
		},
		{
			args: "output:*any",
			description: "sensor turret.x instead of sensor turret.x turret @x"
		},{
			args: "output:*any",
			description: "sensor unit.x instead of sensor unit.x @unit @x"
		},
	],
	set: [{
		args: "variable:*any value:valid",
		description: "Sets the value of (variable) to (value)."
	}],
	op: [
		{
			args: "operand:operand var1:*number arg1:number",
			description: "Performs an operation on var1, mutating it.",
			replace: [ "op %1 %2 %2 %3" ]
		},
		{
			args: "operand:operand var1:*any arg1:valid",
			description: "Performs an operation on var1, mutating it.",
			replace: [ "op %1 %2 %2 %3" ]
		},
		{
			args: "operand:operand output:*number arg1:number arg2:number?",
			description: "Performs an operation between (arg1) and (arg2), storing the result in (output)."
		},
		{
			args: "operand:operand output:*any arg1:valid arg2:valid?",
			description: "Performs an operation between (arg1) and (arg2), storing the result in (output)."
		},{
			args: "operand:operand arg1:*number",
			description: "Performs an operation on arg1, mutating it. Example: \`op abs xDiff\`",
			replace: [ "op %1 %2 %2 0" ]
		}
	],
	wait: [{
		args: "seconds:number",
		description: "Waits for (seconds) seconds."
	}],
	lookup: [{
		args: "type:lookupType output:*any n:number",
		description: "Looks up the (n)th item, building, fluid, or unit type."
	}],
	end: [{
		args: "",
		description: "Terminates execution."
	}],
	jump: [{
		args: "jumpAddress:jumpAddress operandTest:operandTest var1:valid? var2:valid?",
		description: "Jumps to an address or label if a condition is met."
	}],
	ubind: [{
		args: "unitType:type",
		description: "Binds a unit of (unitType). May return dead units if no live ones exist."
	}],
	ucontrol: [
		{
			args: "idle",
			description: "Tells the bound unit to continue current actions, except moving."
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
			args: "itemTake building:building item:type amount:number",
			description: "Tells the bound unit to take at most (amount) of (item) from (building)."
		},{
			args: "payDrop",
			description: "Tells the bound unit to drop its payload."
		},{
			args: "payTake takeUnits:boolean",
			description: "Tells the bound unit to pick up a payload and if to take units."
		},{
			args: "payEnter",
			description: "Tells the bound unit to enter a building(usually a reconstructor)."
		},{
			args: "mine x:number y:number",
			description: "Tells the unit to mine at (x,y)"
		},{
			args: "flag flag:number",
			description: "Sets the flag of the bound unit."
		},{
			args: "build x:number y:number buildingType:type rotation:number config:valid",
			description: "Tells the unit to build (block) with (rotation) and (config) at (x,y)."
		},{
			args: "getBlock x:number y:number buildingType:*type building:*building",
			description: "Gets the building type and building at (x,y) and outputs to (buildingType) and (building)."
		},{
			args: "within x:number y:number radius:number output:*boolean",
			description: "Checks if the unit is within (radius) tiles of (x,y) and outputs to (output)."
		},
	],
	uradar: [
		{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*any",
			description: "Finds units of specified type within the range of the bound unit.",
			replace: [
				"radar %1 %2 %3 %4 0 %5 %6"
			]
		},{
			args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sillyness:any sortOrder:number output:*any",
			description: "Today I learned that the default signature of uradar has a random 0 that doesn't mean anything."
		},{
			args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*unit",
			description: "Finds units of specified type within the range of the bound unit.",
			replace: [
				"radar %1 %1 %1 %2 0 %3 %4"
			]
		},
	],
	ulocate: [
		{
			args: "ore ore:type outX:*number outY:*number found:*boolean",
			description: "Finds ores of specified type near the bound unit.",
			replace: ["ulocate ore core _ %2 %3 %4 %5 _"]
		},{
			args: "spawn outX:*number outY:*number found:*boolean",
			description: "Finds enemy spawns near the bound unit.",
			replace: ["ulocate spawn core _ _ %2 %3 %4 _"]
		},{
			args: "damaged outX:*number outY:*number found:*boolean building:*building",
			description: "Finds damaged buildings near the bound unit.",
			replace: ["ulocate damaged core _ _ %2 %3 %4 %5"]
		},{
			args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
			description: "Finds buildings of specified group near the bound unit.",
			replace: ["ulocate building %2 %3 _ %4 %5 %6 %7"]
		},{
			args: "oreOrSpawnOrAmogusOrDamagedOrBuilding:any buildingGroup:buildingGroup enemy:boolean ore:type outX:*number outY:*number found:*boolean building:*building",
			description: "The wack default ulocate signature, included for compatibility."
		}
	],
});

export default commands;
