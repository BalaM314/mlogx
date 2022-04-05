import fs = require("fs");
import path = require("path");
const [programArgs, fileNames] = parseArgs(process.argv.slice(2));
const stdlibDirectory = path.join(process.argv[1], "..", "..", "stdlib", "build");


enum GenericArgType {
	variable="variable",
	number="number",
	string="string",
	type="type",
	building="building",
	unit="unit",
	function="function",
	any="any",
	null="null",
	operandTest="operandTest",
	targetClass="targetClass",
	unitSortCriteria="unitSortCriteria",
	valid="valid",
	operandType="operandType",
	lookupType="lookupType",
	jumpAddress="jumpAddress"
}

enum CommandErrorType {
	argumentCount,
	type
}
interface CommandError {
	type: CommandErrorType;
	message: string;
}

type ArgType = GenericArgType | string;

function isGenericArg(val:string): val is GenericArgType {
	return GenericArgType[val as GenericArgType] != undefined;
}

/**Represents an argument(type) for a command.*/
class Arg {
	constructor(public type:ArgType, public name:string = "WIP", public optional:boolean = false){}
	toString(){
		if(!isGenericArg(this.type))
			return `${this.type}`;
		if(this.optional)
			return `(${this.name}:${this.type})`;
		else
			return `[${this.name}:${this.type}]`;
	}
}


interface Command {
	args: Arg[];
	replace?: string[];
	description: string;
}

interface PreprocessedCommand {
	args: (string|Arg)[];
	replace?: string[];
	description: string;
}

interface Commands {
	[index: string]: Command[];
}

interface PreprocessedCommands {
	[index: string]: PreprocessedCommand[]
}

function processCommands(preprocessedCommands:PreprocessedCommands):Commands {
	let out:Commands = {};
	for(let [name, commands] of Object.entries(preprocessedCommands)){
		out[name] = [];
		for(let command of commands){
			out[name].push({
				...command,
				args: command.args.map(arg => 
					typeof arg == "string" ? new Arg(arg) : arg
				)
			});
		}
	}
	return out;
}

/** Contains the arguments for all types.*/
let commands: Commands = processCommands({
	call: [{
		args: [new Arg(GenericArgType.function, "function")],
		replace: [
			"set _stack1 @counter",
			"op add _stack1 _stack1 2",
			"jump %1 always"
		],
		description: "Calls a function."
	}],
	increment: [{
		args: [new Arg(GenericArgType.variable, "variable"), new Arg(GenericArgType.number, "amount")],
		replace: ["op add %1 %1 %2"],
		description: "Adds a number to a variable."
	}],
	return: [{
		args: [],
		replace: ["set @counter _stack1"],
		description: "Returns to the main program from a function."
	}],
	throw: [{
		args: [new Arg(GenericArgType.string, "error")],
		replace: [
			"set _err %1",
			"jump _err always"
		],
		description: "Throws an error."
	}],
	uflag: [{
		args: [new Arg(GenericArgType.type, "type")],
		replace: [
			"set _unit_type %1",
			"set _stack1 @counter",
			"op add _stack1 _stack1 2",
			"jump _flag_unit always",
		],
		description: "Binds and flags a unit of specified type."
	}],
	read: [{
		args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.building, "cell"), new Arg(GenericArgType.number, "index")],
		description: "Reads a value from a memory cell."
	}],
	write: [{
		args: [new Arg(GenericArgType.variable, "value"), new Arg(GenericArgType.building, "cell"), new Arg(GenericArgType.number, "index")],
		description: "Writes a value to a memory cell."
	}],
	draw: [
		{
			args: ["clear", new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b")],
			description: "Clears the display."
		},
		{
			args: ["color", new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b"), new Arg(GenericArgType.number, "a")],
			description: "Sets the draw color."
		},
		{
			args: ["stroke", new Arg(GenericArgType.number, "width")],
			description: "Sets the stroke width."
		},
		{
			args: ["line", new Arg(GenericArgType.number, "x1"), new Arg(GenericArgType.number, "y1"), new Arg(GenericArgType.number, "x2"), new Arg(GenericArgType.number, "y2")],
			description: "Draws a line between two points."
		},
		{
			args: ["rect", new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "width"), new Arg(GenericArgType.number, "height")],
			description: "Draws a rectangle."
		},
		{
			args: ["linerect", new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "width"), new Arg(GenericArgType.number, "height")],
			description: "Draws the outline of a rectangle."
		},
		{
			args: ["poly", new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "sides"), new Arg(GenericArgType.number, "radius"), new Arg(GenericArgType.number, "rotation")],
			description: "Draws a (regular) polygon."
		},
		{
			args: ["linepoly", new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "sides"), new Arg(GenericArgType.number, "radius"), new Arg(GenericArgType.number, "rotation")],
			description: "Draws the outline of a polygon."
		},
		{
			args: ["triangle", new Arg(GenericArgType.number, "x1"), new Arg(GenericArgType.number, "y1"), new Arg(GenericArgType.number, "x2"), new Arg(GenericArgType.number, "y2"), new Arg(GenericArgType.number, "x3"), new Arg(GenericArgType.number, "y3")],
			description: "Draws a triangle."
		},
		{
			args: ["image", new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.type, "image"), new Arg(GenericArgType.number, "size"), new Arg(GenericArgType.number, "rotation")],
			description: "Displays an image."
		},
	],
	print: [{
		args: [new Arg(GenericArgType.string, "message")],
		description: "Prints a value to the message buffer."
	}],
	drawflush: [{
		args: [new Arg(GenericArgType.building, "display")],
		description: "Flushes queued draw instructions to a display."
	}],
	printflush: [{
		args: [new Arg(GenericArgType.building, "messageblock")],
		description: "Flushes queued print instructions to a message block."
	}],
	getlink: [{
		args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.number, "number")],
		description: "Gets the nth linked building. Useful when looping over all buildings."
	}],
	control: [
		{
			args: ["enabled", new Arg(GenericArgType.building, "building"), new Arg(GenericArgType.number, "enabled")],
			description: "Sets whether a building is enabled."
		},
		{
			args: ["shoot", new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "shoot")],
			description: "Sets the shoot position of a turret."
		},
		{
			args: ["shootp", new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.unit, "unit"), new Arg(GenericArgType.number, "shoot")],
			description: "Sets the shoot position of a turret to a unit with velocity prediction."
		},
		{
			args: ["config", new Arg(GenericArgType.building, "building"), new Arg(GenericArgType.valid, "config")],
			description: "Sets the config of a building."
		},
		{
			args: ["color", new Arg(GenericArgType.building, "illuminator"), new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b")],
			description: "Sets the color of an illuminator."
		},
	],
	radar: [
		{
			args: [new Arg(GenericArgType.targetClass, "targetClass"), new Arg(GenericArgType.targetClass, "targetClass"), new Arg(GenericArgType.targetClass, "targetClass"), new Arg(GenericArgType.unitSortCriteria, "sortCriteria"), new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.number, "sortOrder"), new Arg(GenericArgType.variable, "output")],
			description: "Finds nearby units of specified type."
		},
		{
			args: [new Arg(GenericArgType.targetClass, "targetClass"), new Arg(GenericArgType.unitSortCriteria, "sortCriteria"), new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.number, "sortOrder"), new Arg(GenericArgType.variable, "output")],
			description: "Finds nearby units of specified type.",
			replace: [
				"radar %1 %1 %1 %2 %3 %4 %5"
			]
		},
	],
	sensor: [
		{
			args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.building, "building"), new Arg(GenericArgType.type, "value")],
			description: "Gets information about a building, does not need to be linked or on the same team."
		},
		{
			args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.unit, "unit"), new Arg(GenericArgType.type, "value")],
			description: "Gets information about a unit, does not need to be on the same team."
		},
	],
	set: [{
		args: [new Arg(GenericArgType.variable, "variable"), new Arg(GenericArgType.valid, "value")],
		description: "Sets a variable."
	}],
	op: [{
		args: [new Arg(GenericArgType.operandType, "operand"), new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.number, "arg1"), new Arg(GenericArgType.number, "arg2")],
		description: "Performs an operation."
	}],
	wait: [{
		args: [new Arg(GenericArgType.number, "seconds")],
		description: "Waits the specified number of seconds."
	}],
	lookup: [{
		args: [new Arg(GenericArgType.lookupType, "type"), new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.number, "index")],
		description: "Looks up an item, building, fluid, or unit type."
	}],
	end: [{
		args: [],
		description: "Terminates execution."
	}],
	jump: [{
		args: [new Arg(GenericArgType.jumpAddress, "jumpAddress"), new Arg(GenericArgType.operandTest, "operandTest"), new Arg(GenericArgType.valid, "var1", true), new Arg(GenericArgType.valid, "var2", true)],
		description: "Jumps to an address or label if a condition is met."
	}],
	ubind: [{
		args: [new Arg(GenericArgType.type, "unitType")],
		description: "Binds a unit of specified type. May return dead units."
	}],
	ucontrol: [
		{
			args: [new Arg("")],
			description: "Controls the bound unit."
		},
		{
			args: [],
			description: "Controls the bound unit."
		},
		{
			args: [],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
		{
			args: [new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true), new Arg(GenericArgType.number, "WIP", true), new Arg(GenericArgType.any, "WIP", true)],
			description: "Controls the bound unit."
		},
	],
	uradar: [{
		args: [new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.unitSortCriteria), new Arg(GenericArgType.number), new Arg(GenericArgType.number), new Arg(GenericArgType.variable)],
		description: "Finds other units of specified class near the bound unit."
	}],
	ulocate: [{
		args: [new Arg(GenericArgType.any), new Arg(GenericArgType.any), new Arg(GenericArgType.number), new Arg(GenericArgType.type), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable)],
		description: "Finds buildings of specified type near the bound unit."
	}],
});

let var_code: {
	[index: string]: string[];
} = {
	"cookie": [
		`op mul _cookie @thisx @maph`,
		`op add _cookie @thisy @cookie`
	]
}

let settings = {
	errorlevel: "warn",
	compilerMode: ""
};

function exit(message: string):never {
	console.error(message);
	process.exit(1);
}

function typeofArg(arg:string):GenericArgType {
	if(arg == "") return GenericArgType.null;
	if(arg == undefined) return GenericArgType.null;
	arg = arg.toLowerCase();
	if(arg.match(/@[a-z\-]+/i)){
		if(arg == "@counter") return GenericArgType.variable;
		if(arg == "@unit") return GenericArgType.unit;
		if(arg == "@thisx") return GenericArgType.number;
		if(arg == "@thisy") return GenericArgType.number;
		if(arg == "@this") return GenericArgType.building;
		if(arg == "@ipt") return GenericArgType.number;
		if(arg == "@links") return GenericArgType.number;
		if(arg == "@time") return GenericArgType.number;
		if(arg == "@ipt") return GenericArgType.number;
		if(arg == "@tick") return GenericArgType.number;
		if(arg == "@mapw") return GenericArgType.number;
		if(arg == "@maph") return GenericArgType.number;
		return GenericArgType.type;
	}
	if(["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg)) return GenericArgType.operandTest;
	if(["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg)) return GenericArgType.targetClass;
	if(arg == "true" || arg == "false") return GenericArgType.number;
	if(arg.match(/^-?[\d]+$/)) return GenericArgType.number;
	if(arg.match(/^"[^"]*"$/gi)) return GenericArgType.string;
	if(arg.match(/^[a-z]+[\d]+$/gi)) return GenericArgType.building;
	if(arg.match(/^[^"]+$/i)) return GenericArgType.variable;
	return GenericArgType.null;
}
function isArgOfType(arg:string, type:ArgType):boolean {
	if(type === GenericArgType.any) return true;
	if(arg == "0") return true;
	if(arg == "") return false;
	if(arg == undefined) return false;
	arg = arg.toLowerCase();
	if(!isGenericArg(type)){
		return arg === type;
	}
	let knownType:GenericArgType = typeofArg(arg);
	if(knownType == type) return true;
	switch(type){
		case GenericArgType.type:
		case GenericArgType.number:
		case GenericArgType.string:
		case GenericArgType.building:
		case GenericArgType.unit:
		case GenericArgType.function:
			return knownType == GenericArgType.variable;
		case GenericArgType.operandTest:
			return ["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg);
		case GenericArgType.operandType:
			return true;
		case GenericArgType.lookupType:
			return ["building", "unit", "fluid", "item"].includes(arg);
		case GenericArgType.targetClass:
			return ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg);
		case GenericArgType.operandTest:
			return true;//todo make the super long array
		case GenericArgType.unitSortCriteria:
			return ["distance", "health", "shield", "armor", "maxHealth"].includes(arg);
		case GenericArgType.valid:
			return true;//this needs intellijence
		case GenericArgType.jumpAddress:
			return knownType == GenericArgType.number || knownType == GenericArgType.variable;
	}
	return false;
}

class CompilerError extends Error {
	constructor(message?: string){
		super(...arguments);
		this.name = "CompilerError";
	}
}

function compileMlogxToMlog(program:string[], options:{filename:string, errorlevel:string, compilerMode:string}):string[] {

	let [programType, requiredVars] = parsePreprocessorDirectives(program);

	let isMain = programType == "main" || options.compilerMode == "single";

	function err(message:string){
		if(options.errorlevel == "warn"){
			console.warn("Error: " + message);
		} else {
			throw new CompilerError(message);
		}
	}
	
	let outputData = [];

	for(let requiredVar of requiredVars){
		if(var_code[requiredVar])
			outputData.push(...var_code[requiredVar]);
		else
			err("Unknown require " + requiredVar);
	}
	
	//OMG I USED A JS LABEL
	nextLine:
	for(let line of program){

		if(line.includes("#") || line.includes("//")){
			//Remove comments
			if(!false){
				line = line.split("#")[0];
				line = line.split("//")[0];
			}
		}

		line = line.replace("\t", "");
		//Remove tab characters 

		if(line == "") continue;

		if(isMain)
			line = line.split(" ").map(arg => arg.startsWith("__") ? `__${options.filename}${arg}` : arg).join(" ");
		//If an argument starts with __, then prepend __[filename] to avoid name conflicts.

		if(line.match(/[^ ]+:$/)){
			//line is a label, don't touch it
			outputData.push(line);
			continue;
		}

		let args = line.split(" ");
		if(line.includes(`"`)){
			//aaaaaaaaaaaaaaaaa
			let replacementLine = [];
			let isInString = false;
			for(var char of line){
				if(char == `"`){
					isInString = !isInString;
				}
				if(isInString && char == " "){
					replacementLine.push("\uFFFD");
				} else {
					replacementLine.push(char);
				}
			}
			args = replacementLine.join("").split(" ").map(arg => arg.replaceAll("\uFFFD", " "));
			//smort logic so `"amogus sus"` is parsed as one arg
			//hmm I've automatically used backticks to make it clear that the quotes are included
			//wonder if anyone understands that
		}

		let commandList = commands[args[0].toLowerCase()];
		if(!commandList){
			err(`Unknown command ${args[0]}\nat \`${line}\``);
			continue;
		}

		let error:any;//typescript why
		for(let command of commandList){
			let result = checkCommand(args, command, line);
			if(result instanceof Array){
				outputData.push(...result);
				continue nextLine;
			} else {
				error = result;
			}
		}
		if(commandList.length == 1){
			err(error.message);
		} else {
			err(
	`Line
	\`${line}\`
	did not match any overloads for command ${args[0]}`
			);
		}
		if(!commandList[0].replace){
			outputData.push(line + "#Error");
		}

	}
	return outputData;
}

function checkCommand(args:string[], command:Command, line:string): string[] | CommandError {
	let commandArguments = args.slice(1);
	if(commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.optional).length){
		return {
			type: CommandErrorType.argumentCount,
			message:
`Incorrect number of arguments for command ${args[0]}
	at \`${line}\`
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
		};
	}

	for(let arg in commandArguments){
		if(!isArgOfType(commandArguments[+arg], command.args[+arg].type)){
			return {
				type: CommandErrorType.type,
				message:
`Type mismatch: value ${commandArguments[+arg]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(commandArguments[+arg])}
	at \`${line}\``
			};
		}
		
	}

	if(command.replace){
		let out = [];
		for(var replaceLine of command.replace){
			replaceLine = replaceLine.replace(/%1/g, args[1]);
			replaceLine = replaceLine.replace(/%2/g, args[2]);
			replaceLine = replaceLine.replace(/%3/g, args[3]);
			out.push(replaceLine);
		}
		return out;
	}

	return [line];
}

function parsePreprocessorDirectives(data:string[]): [string, string[]] {
	let program_type:string = "unknown";
	let required_vars:string[] = [];
	for(let line of data){
		if(line.startsWith("#require ")){
			required_vars.push(...line.split("#require ")[1].split(",").map(el => el.replaceAll(" ", "")).filter(el => el != ""));
		}
		if(line.startsWith("#program_type ")){
			let type = line.split("#program_type ")[1];
			if(type == "never" || type == "main" || type == "function"){
				program_type = type;
			}
		}
	}

	return [program_type, required_vars];

}

function parseArgs(args: string[]): [
	{[index: string]: string;},
	string[]
]{
	let parsedArgs: {
		[index: string]: string;
	} = {};
	let argName:string = "";
	let mainArgs = [];
	for (let arg of args) {
		if(arg.startsWith("--")){
			argName = arg.slice(2);
			parsedArgs[arg.toLowerCase().slice(2)] = "null";
		} else if(argName){
			parsedArgs[argName] = arg.toLowerCase();
			argName = "null";
		} else {
			mainArgs.push(arg);
		}
	}
	return [parsedArgs, mainArgs];
}

function main(){
	//Option to specify directory to compile in

	if(programArgs["help"]){
		console.log(
`Usage: compile [--help] [--directory <directory>] [--info <command>] directory
\t--help\tDisplays this help message and exits.
\t--info\tShows information about a command.
directory: The directory to compile in.
`		);
		process.exit(0);
	}
	if(programArgs["info"]){
		if(programArgs["info"] == "null") return console.log("Please specify a command to get information on.");
		if(!commands[programArgs["info"]])
			console.log(`Unknown command ${programArgs["info"]}`);
		else
			console.log(
`${programArgs["info"]}
Usage:

${commands[programArgs["info"]].map(
	command => programArgs["info"] + " " + command.args.map(arg => arg.toString()).join(" ") + "\n" + command.description).join("\n\n"
)}
`
			);//todo clean this up ^^
		process.exit(0);
	}

	if(fileNames[0] == undefined){
		exit("Please specify a project or directory to compile in");
	}
	try {
		if(fs.existsSync(path.join(fileNames[0], "src")) && fs.lstatSync(path.join(fileNames[0], "src")).isDirectory()){
			settings.compilerMode = "project";
			console.log("Compiling project " + fileNames[0]);
		} else if(fs.existsSync(fileNames[0]) && fs.lstatSync(fileNames[0]).isDirectory()){
			settings.compilerMode = "single";
			console.log("Compiling folder " + fileNames[0]);
		} else {
			exit("Invalid directory specified!");
		}
		// process.chdir(path.join(process.cwd(), fileNames[0]));
	} catch(err){
		exit("Invalid directory specified.");
	}

	compile_directory(fileNames[0], settings);
}

function compile_directory(directory:string, options: {
	compilerMode: string,
	errorlevel: string
}){

	const sourceDirectory = options.compilerMode == "project" ? path.join(directory, "src") : directory;
	const outputDirectory = options.compilerMode == "project" ? path.join(directory, "build") : sourceDirectory;


	if(options.compilerMode == "project" && !fs.existsSync(outputDirectory)){
		fs.mkdirSync(outputDirectory);
	}

	/**List of filenames ending in .mlogx in the src directory. */
	let filelist_mlogx:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	let filelist_mlog:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlog$/));

	let filelist_stdlib:string[] = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/.mlog$/));
	console.log("Files to compile: ", filelist_mlogx);

	let compiledData: {
		[index: string]: string;
	} = {};
	let stdlibData: {
		[index: string]: string;
	} = {};
	let mainData = "";

	for(let filename of filelist_stdlib){
		stdlibData[filename] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8');
	}

	for(let filename of filelist_mlogx){
		//For each filename in the file list

		console.log(`Compiling file ${filename}`);
		let data:string[] = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split("\r\n");
		//Load the data
		
		let outputData;
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(data, {
				filename,
				...options
			}).join("\r\n");
		} catch(err){
			console.error(`Failed to compile file ${filename}!`);
			if(err instanceof CompilerError)
				console.error(err.message);
			else 
				console.error(err);
			return;
		}
		if(options.compilerMode == "single"){
			outputData += "\r\nend\r\n#stdlib\r\n\r\n";
			outputData += Object.values(stdlibData).join("\r\nend\r\n\r\n");
		}
		//Write .mlog files to output
		fs.writeFileSync(
			path.join(outputDirectory, filename.slice(0,-1)),
			outputData
		);
		if(options.compilerMode == "project"){
			//if #program_type is never, then skip saving the compiled data
			if(data.includes("#program_type never")) continue;
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlogx"){
				compiledData[filename] = outputData;
			} else {
				mainData = outputData;
			}
		}
	}

	if(options.compilerMode == "project"){
		for(let filename of filelist_mlog){
			//For each filename in the other file list
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlog"){
				compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8');
			} else {
				mainData = fs.readFileSync(`src/${filename}`, 'utf-8');
			}
		}
		console.log("Compiled all files successfully.");
		console.log("Assembling output:");
		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			mainData + "\r\nend\r\n#functions\r\n\r\n" + Object.values(compiledData).join("\r\nend\r\n\r\n") + "\r\nend\r\n#stdlib\r\n\r\n" + Object.values(stdlibData).join("\r\nend\r\n\r\n")
		);
		console.log("Done!");
	} else {
		console.log("Done!");
	}
}

main();
