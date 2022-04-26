/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import * as path from "path";
import * as fs from "fs";
import commands from "./commands.js";
import { compileMlogxToMlog } from "./compile.js";
import { parseArgs, exit } from "./funcs.js";
import { defaultConfig, compilerMark } from "./consts.js";
import { CompilerError } from "./classes.js";

function main(processArgs: string[]){
	const [programArgs, fileNames] = parseArgs(processArgs.slice(2));
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
	command => programArgs["info"] + " " + command.args
		.map(arg => arg.toString())
		.join(" ") + "\n" + command.description
	).join("\n\n")}
`
			);//todo clean this up ^^
		process.exit(0);
	}

	if(fileNames[0] == undefined){
		exit("Please specify a project or directory to compile in");
	}
	try {
		if(fs.existsSync(fileNames[0]) && fs.lstatSync(fileNames[0]).isDirectory()){
			console.log("Compiling folder " + fileNames[0]);
		} else {
			exit("Invalid directory specified!");
		}
		// process.chdir(path.join(process.cwd(), fileNames[0]));
	} catch(err){
		exit("Invalid directory specified.");
	}

	compileDirectory(fileNames[0]);
}

function compileDirectory(directory:string){

	let settings = defaultConfig;

	try {
		fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
		settings = {
			...settings,
			...JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"))
		};
		//Todo: config file validation
	} catch(err){
		console.log("No config.json found, using default settings.");
	}
	
	if(
		!(fs.existsSync(path.join(directory, "src")) &&
		fs.lstatSync(path.join(directory, "src")).isDirectory())
		&& settings.compilerOptions.mode == "project"
	){
		console.error(`Compiler mode set to "project" but no src directory found.`);
		settings.compilerOptions.mode = "single";
	}

	const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
	const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
	const stdlibDirectory = path.join(process.argv[1], "..", "..", "stdlib", "build");


	if(settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)){
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

	if(settings.compilerOptions.include.includes("stdlib")){
		for(let filename of filelist_stdlib){
			stdlibData[filename] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8');
		}
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
				...settings
			}).join("\r\n");
		} catch(err){
			console.error(`Failed to compile file ${filename}!`);
			if(err instanceof CompilerError)
				console.error(err.message);
			else 
				console.error(err);
			return;
		}
		if(settings.compilerOptions.mode == "single"){
			outputData += "\r\nend\r\n#stdlib\r\n\r\n";
			outputData += Object.values(stdlibData).join("\r\nend\r\n\r\n");
			outputData += "\r\n" + compilerMark;
		}
		//Write .mlog files to output
		fs.writeFileSync(
			path.join(outputDirectory, filename.slice(0,-1)),
			outputData
		);
		if(settings.compilerOptions.mode == "project"){
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

	if(settings.compilerOptions.mode == "project"){
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

		let outputData = mainData;
		outputData += "\r\nend\r\n#functions\r\n\r\n" + Object.values(compiledData).join("\r\nend\r\n\r\n");
		if(settings.compilerOptions.include.includes("stdlib")){
			outputData += "\r\nend\r\n#stdlib\r\n\r\n" + Object.values(stdlibData).join("\r\nend\r\n\r\n");
		}

		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			outputData
		);
		console.log("Done!");
	} else {
		console.log("Done!");
	}
}
main(process.argv);
