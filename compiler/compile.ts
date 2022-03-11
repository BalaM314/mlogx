const fs = require("fs");
const programArgs = process.argv.slice(2);
if(process.cwd().match(/compiler$/gi)){
	process.chdir("..");
}

enum ArgType {
	variable="variable",
	number="number",
	string="string",
	type="type",
	building="building",
	unit="unit",
	function="function",
	any="any",
	null="null",
	operand_test="operand_test",
	targetClass="targetClass"
}
class Arg {
	constructor(public type:ArgType, public optional = false){
		
	}
	toString(){
		if(this.optional){
			return `(${this.type})`;
		} else {
			return `[${this.type}]`;
		}
	}
}

//Contains the arguments for all types.
let commands: {
	[index: string]: {
		args: Arg[];
		replace?: string[];
	};
} = {
	call: {
		args: [new Arg(ArgType.function)],
		replace: [
			"set _stack1 @counter",
			"op add _stack1 _stack1 2",
			"jump %1 always"
		]
	},
	increment: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.number)],
		replace: ["op add %1 %1 %2"]
	},
	return: {
		args: [],
		replace: ["set @counter _stack1"]
	},
	throw: {
		args: [new Arg(ArgType.string)],
		replace: [
			"set _err %1",
			"jump _err always"
		]
	},
	read: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)]
	},
	write: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)]
	},
	draw: {
		args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number)]
	},
	print: {
		args: [new Arg(ArgType.string)]
	},
	drawflush: {
		args: [new Arg(ArgType.building)]
	},
	printflush: {
		args: [new Arg(ArgType.building)]
	},
	getlink: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.number)]
	},
	control: {
		args: [new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any)]
	},
	radar: {
		args: [new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.number), new Arg(ArgType.variable)]
	},
	sensor: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.any), new Arg(ArgType.type)]
	},
	set: {
		args: [new Arg(ArgType.variable), new Arg(ArgType.any)]
	},
	op: {
		args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number), new Arg(ArgType.number)]
	},
	wait: {
		args: [new Arg(ArgType.number)]
	},
	lookup: {
		args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number)]
	},
	end: {
		args: []
	},
	jump: {
		args: [new Arg(ArgType.number), new Arg(ArgType.operand_test), new Arg(ArgType.any, true), new Arg(ArgType.any, true)]
	},
	ubind: {
		args: [new Arg(ArgType.type)]
	},
	ucontrol: {
		args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.number), new Arg(ArgType.any)]
	},
	uradar: {
		args: [new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.variable)]
	},
	ulocate: {
		args: [new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable)]
	},
};

let settings = {
	errorlevel: "warn"
};

function typeofArg(arg:string):ArgType {
	if(arg == "") return ArgType.null;
	arg = arg.toLowerCase();
	if(arg.match(/@[a-z\-]+/i)){
		if(arg == "@counter") return ArgType.variable;
		if(arg == "@unit") return ArgType.unit;
		if(arg == "@thisx") return ArgType.number;
		if(arg == "@thisy") return ArgType.number;
		if(arg == "@this") return ArgType.building;
		if(arg == "@ipt") return ArgType.number;
		if(arg == "@links") return ArgType.number;
		if(arg == "@time") return ArgType.number;
		if(arg == "@ipt") return ArgType.number;
		if(arg == "@tick") return ArgType.number;
		if(arg == "@mapw") return ArgType.number;
		if(arg == "@maph") return ArgType.number;
		return ArgType.type;
	}
	if(["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg)) return ArgType.operand_test;
	if(["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg)) return ArgType.targetClass;
	if(arg == "true") return ArgType.number;
	if(arg.match(/^-?[\d]+$/)) return ArgType.number;
	if(arg.match(/^"[^"]*"$/gi)) return ArgType.string;
	if(arg.match(/^[a-z]+[\d]+$/gi)) return ArgType.building;
	if(arg.match(/^[^"]+$/i)) return ArgType.variable;
	return ArgType.null;
}
function isArgOfType(arg:string, type:ArgType):boolean {
	if(type == ArgType.any) return true;
	if(arg == "0") return true;
	if(arg == "") return false;
	arg = arg.toLowerCase();
	let knownType:ArgType = typeofArg(arg);
	switch(type){
		case ArgType.variable: return knownType == type;
		case ArgType.type:
		case ArgType.number:
		case ArgType.string:
		case ArgType.building:
		case ArgType.unit:
		case ArgType.function:
			return knownType == type || knownType == ArgType.variable;
		case ArgType.operand_test:
		case ArgType.targetClass:
			return knownType == type;
	}


}

class CompilerError extends Error {
	constructor(message?: string){
		super(...arguments);
		this.name = "CompilerError";
	}
}

function compileMlogxToMlog(program:string[], data:{filename:string}):string[] {

	function err(message){
		if(settings.errorlevel == "warn"){
			console.warn("Warning: " + message);
		} else {
			throw new CompilerError(message);
		}
	}
	
	let outputData = [];
	for(var line of program){

		if(line.includes("#") || line.includes("//")){
			//Remove comments
			if(!false){
				line = line.split("#")[0];
				line = line.split("//")[0];
			}
		}
		if(line == "") continue;

		line = line.split(/ /).map(arg => arg.startsWith("__") ? `__${data.filename}${arg}` : arg).join(" ");

		if(line.match(/:$/)){
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
		}
		let command = commands[args[0].toLowerCase()];
		if(!command){
			err(`Unknown command ${args[0]}\nat ${line}`);
		}

		if(args.length - 1 > command.args.length || args.length - 1 < command.args.filter(arg => !arg.optional).length){
			err(
`Incorrect number of arguments for command ${args[0]}
at ${line}
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
			);
		}

		for(let arg in command.args){
			if(!isArgOfType(args[+arg+1], command.args[+arg].type)){
				err(
`Type mismatch: value ${args[+arg+1]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(args[+arg+1])}
\tat \`${line}\``
				);
			}
			
		}

		if(command.replace){
			for(var replaceLine of command.replace){
				replaceLine = replaceLine.replace(/%1/g, args[1]);
				replaceLine = replaceLine.replace(/%2/g, args[2]);
				replaceLine = replaceLine.replace(/%3/g, args[3]);
				outputData.push(replaceLine);
			}
			continue;
		}

		outputData.push(line);

	}
	return outputData;
}

function main(){
	//Option to specify directory to compile in
	if(programArgs[0] == "--directory" && programArgs[1]){
		console.log("Compiling in directory " + programArgs[1]);
		process.chdir(programArgs[1]);
	}
	if(programArgs[0] == "--help"){
		if(!commands[programArgs[1]])
			console.log(`Unknown command ${programArgs[1]}`);
		else
			console.log(`Usage: ${programArgs[1]} ${commands[programArgs[1]].args.map(arg => arg.toString()).join(" ")}`);
		return;
	}

	//Look for an src directory to compile from
	if(!fs.existsSync(process.cwd() + "/src")){
		console.error("No src directory found!");
		return;
	}
	//Create a build folder if it doesn't already exist
	if(!fs.existsSync(process.cwd() + "/build")){
		fs.mkdirSync(process.cwd() + "/build");
	}

	/**List of filenames ending in .mlogx in the src directory. */
	let filelist_mlogx:string[] = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	let filelist_mlog:string[] = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlog$/));
	console.log("Files to compile: ", filelist_mlogx);

	let compiledData: {
		[index: string]: string;
	} = {};
	let mainData = "";

	for(let filename of filelist_mlogx){
		//For each filename in the file list

		console.log(`Compiling file ${filename}`);
		let data:string[] = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
		//Load the data
		
		let outputData;
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(data, {
				filename: filename.split(".mlogx")[0] == "main.mlogx" ? "" : filename.split(".mlogx")[0]
			}).join("\r\n");
		} catch(err){
			console.error(`Failed to compile file ${filename}!`);
			console.error(err.message);
			return;
		}
		//Write .mlog files to /build
		fs.writeFileSync(
			`build/${filename.slice(0,-1)}`,
			outputData
		);
		//if #include is never, then skip saving the compiled data
		if(data[0] == "#include never") continue;
		//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
		if(filename != "main.mlogx"){
			compiledData[filename] = outputData;
		} else {
			mainData = outputData;
		}
	}

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
		`out.mlog`,
		mainData + "\r\nend\r\n\r\n" + Object.values(compiledData).join("\r\n\r\n")
	);
	console.log("Done!");
}


main();
