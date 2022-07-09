#!/usr/bin/env node

/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/

import * as path from "path";
import * as fs from "fs";
import { commands } from "./commands.js";
import { checkTypes, compileMlogxToMlog } from "./compile.js";
import { addJumpLabels, askQuestion, parseIcons } from "./funcs.js";
import { defaultSettings, compilerMark } from "./consts.js";
import { CompilerError } from "./classes.js";
import { Settings } from "./types.js";
import { Application } from "cli-app";

const mlogx = new Application("mlogx", "A Mindustry Logic transpiler.");
mlogx.command("info", "Shows information about a logic command", (opts) => {
	let command = opts.positionalArgs[0]!;
	if(!commands[command]){
		console.log(`Unknown command ${command}`);
		return 1;
	} else {
		console.log(
`${command}
Usage:

${commands[command].map(
commandDefinition => command + " " + commandDefinition.args
	.map(arg => arg.toString())
	.join(" ") + "\n" + commandDefinition.description
).join("\n\n")}
`
		);//todo clean this up ^^
		return 0;
	}


}, false, {
	namedArgs: {},
	positionalArgs: [{
		name: "command",
		description: "The command to get information about"
	}]
}, ["i"]);

mlogx.command("init", "Creates a new project", (opts) => {
	createProject(opts.positionalArgs[0] as string|undefined)
		.catch(err => console.error(err?.message ?? err));
}, false, {
	positionalArgs: [
		{
			name: "projectname",
			description: "Name of the project to create",
			required: false
		}
	],
	namedArgs: {}
}, ["new", "n"]);

mlogx.command("compile", "Compiles a file or directory", (opts, app) => {
	if("init" in opts.namedArgs){
		console.error(`"${app.name} --init" was moved to "${app.name} init".`); return 1;
	}
	if("info" in opts.namedArgs){
		console.error(`"${app.name} --info" was moved to "${app.name} info".`); return 1;
	}

	const target = opts.positionalArgs[0] ?? process.cwd();

	if("watch" in opts.namedArgs){
		let lastCompiledTime = Date.now();
		console.log(opts.positionalArgs);
		compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
		fs.watch(target, {
			recursive: true
		}, (type, filename) => {
			if(filename?.toString().endsWith(".mlogx")){
				if(Date.now() - lastCompiledTime > 1000){//WINDOWSSSSSSS
					console.log(`\nFile changes detected! ${filename.toString()}`);

					let parentdirs = filename.toString().split(path.sep).slice(0, -1);
					let dirToCompile:string;

					if(parentdirs.at(-1) != undefined){
						if(parentdirs.at(-1) == "src"){
							if(parentdirs.at(-2)){
								dirToCompile = parentdirs.slice(0, -1).join(path.sep);
							} else {
								dirToCompile = process.cwd();
							}
						} else {
							dirToCompile = parentdirs.join(path.sep);
						}
					} else {
						dirToCompile = process.cwd();
					}
					console.log(`Compiling directory ${dirToCompile}`);


					compileDirectory(dirToCompile, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
					lastCompiledTime = Date.now();
				}
			}
		});
		return -1;
	}
	if(!fs.existsSync(target)){
		console.error(`Invalid path specified.\nPath ${target} does not exist.`);
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		console.log(`Compiling folder ${target}`);
		compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
		return 0;
	} else {
		console.error(`Compiling file ${target}`);
		compileFile(target, defaultSettings);
		return 0;
	}
}, true, {
	positionalArgs: [{
		name: "target",
		description: "Thing to compile",
		required: false
	}],
	namedArgs: {
		watch: {
			description: "Whether to watch for and compile on file changes instead of exiting immediately.",
			needsValue: false
		}
	}
}, ["build"]);

mlogx.command("generate-labels", "Adds jump labels to MLOG code with hardcoded jumps.", (opts, app) => {
	const target = opts.positionalArgs[0];
	if(!fs.existsSync(target)){
		console.error(`Invalid path specified.\nPath ${target} does not exist.`);
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		console.error(`Invalid path specified.\nPath ${target} is a directory.`);
		return 1;
	} else {
		console.log(`Adding jump labels to file ${target}`);
		const data = fs.readFileSync(target, "utf-8").split(/\r?\n/g);
		const output = addJumpLabels(data);
		console.log(`Writing to ${opts.namedArgs["output"]!}`);
		fs.writeFileSync(opts.namedArgs["output"]!, output.join("\r\n"));
		return 0;
	}
}, false, {
	namedArgs: {
		output: {
			description: "Output file path",
			required: true
		}
	},
	positionalArgs: [{
		name: "source",
		description: "File containing the MLOG code",
		required: true
	}],
}, ["generateLabels", "gen-labels", "genLabels", "gl"]);

function main(argv: string[]){
	mlogx.run(argv);
}

function compileDirectory(directory:string, stdlibPath:string, settings:Settings){
	try {
		fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
		settings = {
			...settings,
			...JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"))
		};
		if((settings as any)["compilerVariables"]){
			settings.compilerConstants = (settings as any)["compilerVariables"];
		}
		//Todo: config file validation
	} catch(err){
		console.log("No config.json found, using default settings.");
	}
	
	const icons = parseIcons(fs.readFileSync(path.join(process.argv[1], "../cache/icons.properties"), "utf-8").split(/\r?\n/));

	let srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();

	if(!srcDirectoryExists && settings.compilerOptions.mode == "project"){
		console.error(`Compiler mode set to "project" but no src directory found.`);
		settings.compilerOptions.mode = "single";
	}
	if(srcDirectoryExists){
		settings.compilerOptions.mode = "project";
	}

	const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
	const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
	const stdlibDirectory = path.join(stdlibPath, "build");


	if(settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)){
		fs.mkdirSync(outputDirectory);
	}

	/**List of filenames ending in .mlogx in the src directory. */
	let filelist_mlogx:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	let filelist_mlog:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
	let filelist_stdlib:string[] = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
	console.log("Files to compile: ", filelist_mlogx);

	let compiledData: {
		[index: string]: string[];
	} = {};
	let mainData: string[] = [];
	let stdlibData: {
		[index: string]: string[];
	} = {};

	for(let filename of filelist_stdlib){
		//For each filename in the stdlib
		// Load the file into stdlibData
		stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
	}

	for(let filename of filelist_mlogx){
		//For each filename in the file list

		console.log(`Compiling file ${filename}`);
		let data:string[] = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
		//Load the data
		
		let outputData: string[];
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(data, {
				filename,
				...settings
			}, {
				...icons,
				filename: filename.split(".")[0],
				name: settings.name,
				authors: settings.authors.join(", "),
				...settings.compilerConstants,
			});
		} catch(err){
			console.error(`Failed to compile file ${filename}!`);
			if(err instanceof CompilerError)
				console.error(err.message);
			else 
				console.error(err);
			return;
		}
		if(settings.compilerOptions.mode == "single"){
			outputData.push("end", ...compilerMark);
			if(settings.compilerOptions.checkTypes){
				try {
					checkTypes(outputData, settings, data);
				} catch(err){
					if(err instanceof CompilerError)
						console.error((err as any).message);
					else
						throw err;
				}
		
			}
		}
		//Write .mlog files to output
		fs.writeFileSync(
			path.join(outputDirectory, filename.slice(0,-1)),
			outputData.join("\r\n")
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
				compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			} else {
				mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			}
		}
		console.log("Compiled all files successfully.");
		console.log("Assembling output:");

		let outputData:string[] = [
			...mainData, "end", "",
			"#functions",
			//bizzare hack to use spread operator twice
			...([] as string[]).concat(...
				Object.values(compiledData).map(program => program.concat("end"))
			), "",
			"#stdlib functions",
			...([] as string[]).concat(...
				Object.entries(stdlibData).filter(
					([name, program]) => settings.compilerOptions.include.includes(name)
				).map(([name, program]) => program.concat("end"))
			),
			"", ...compilerMark
		];
		
		if(settings.compilerOptions.checkTypes){
			try {
				checkTypes(outputData, settings);
			} catch(err){
				if(err instanceof CompilerError)
					console.error((err as any).message);
				else
					throw err;
			}
	
		}

		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			outputData.join("\r\n")
		);
	}
	console.log("Done!");
}

function compileFile(name:string, settings:Settings){

	const icons = parseIcons(fs.readFileSync(path.join(process.argv[1], "../cache/icons.properties"), "utf-8").split(/\r?\n/));

	let data:string[] = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
	let outputData:string[];
	try {
		outputData = compileMlogxToMlog(data, {
			filename: name,
			...settings
		}, {
			...icons,
			filename: name.split(".")[0],
			name: settings.name,
			authors: settings.authors.join(", "),
			...settings.compilerConstants,
		});
	} catch(err){
		console.error(`Failed to compile file ${name}!`);
			if(err instanceof CompilerError)
				console.error(err.message);
			else 
				console.error(err);
			return;
	}

	if(settings.compilerOptions.checkTypes){
		try {
			checkTypes(outputData, settings);
		} catch(err){
			if(err instanceof CompilerError)
				console.error((err as any).message);
			else
				throw err;
		}
	}
	
	fs.writeFileSync(name.slice(0, -1), outputData.join("\r\n"));
}

async function createProject(name:string|undefined){
	if(!name){
		name = await askQuestion("Project name: ");
	}
	if(fs.existsSync(path.join(process.cwd(), name))){
		throw new Error(`Directory ${name} already exists.`);
	}
	if(/[\.\/\\]/.test(name)){
		throw new Error(`Name ${name} contains invalid characters.`);
	}
	const authors:string[] = (await askQuestion("Authors: ")).split(" ");
	fs.mkdirSync(path.join(process.cwd(), name));
	fs.mkdirSync(path.join(process.cwd(), name, "src"));
	fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify({
		...defaultSettings,
		name,
		authors,
		compilerOptions: {
			...defaultSettings.compilerOptions,
			mode: "project"
		}
	}, null, "\t"), "utf-8");
	console.log(`Successfully created a new project in ${path.join(process.cwd(), name)}`);
	return true;
}

try {
	main(process.argv);
} catch(err){
	console.error("Unhandled runtime error!");
	console.error(err);
	console.error("Please report this to BalaM314 by pinging him on discord.");
	process.exit(1);
}
