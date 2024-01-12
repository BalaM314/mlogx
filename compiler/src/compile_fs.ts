/**
Copyright © <BalaM314>, 2024.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains impure functions related to compiling that interact with the filesystem.
*/

import * as fs from "fs";
import path from "path";
import * as yup from "yup";
import { CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark } from "./consts.js";
import { Log } from "./Log.js";
import { askQuestion, getLocalState, getState } from "./funcs.js";
import { Settings, settingsSchema } from "./settings.js";
import { Options } from "cli-app";

export function compileDirectory(directory:string, stdlibPath:string, icons:Map<string, string>, options:Options){

	const settings = getSettings(directory);
	const globalState = getState(settings, directory, options);
	const srcDirectoryExists = fs.existsSync(path.join(directory, "src"))&& fs.lstatSync(path.join(directory, "src")).isDirectory();

	if(!srcDirectoryExists && globalState.compilerOptions.mode == "project"){
		Log.printMessage("compiler mode project but no src directory", {});
		globalState.compilerOptions.mode = "single";
	}
	if(srcDirectoryExists){
		globalState.compilerOptions.mode = "project";
	}

	const sourceDirectory = globalState.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
	const outputDirectory = globalState.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
	const stdlibDirectory = path.join(stdlibPath, "build");


	//If in project mode and build/ doesn't exist, create it
	if(globalState.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)){
		fs.mkdirSync(outputDirectory);
	}

	/**List of filenames ending in .mlogx in the src directory. */
	const mlogxFilelist:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	const mlogFilelist:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
	const stdlibFilelist:string[] = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
	const compiledData: {
		[index: string]: string[];
	} = {};
	let mainData: string[] = [];
	const stdlibData: {
		[index: string]: string[];
	} = {};
	
	Log.printMessage("files to compile", mlogxFilelist);

	for(const filename of stdlibFilelist){
		//For each filename in the stdlib
		// Load the file into stdlibData
		stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
	}

	for(const filename of mlogxFilelist){
		//For each filename in the file list

		Log.printMessage("compiling file", {filename});
		const state = getLocalState(globalState, filename, icons);
		const data:string[] = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
		//Load the data
		
		let outputData: string[];
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(
				data, state
			).outputProgram.map(s => s.text);
		} catch(err){
			Log.printMessage("compiling file failed", {filename});
			if(err instanceof CompilerError)
				Log.err(err.message);
			else
				Log.dump(err);
			return;
		}
		if(globalState.compilerOptions.mode == "single" && !globalState.compilerOptions.removeCompilerMark){
			outputData.push("end", ...compilerMark);
		}
		//Write .mlog files to output
		fs.writeFileSync(
			path.join(outputDirectory, filename.replace(/\.mlogx$/, ".mlog")), //this is safe because only files ending in .mlogx are on the list
			outputData.join("\r\n")
		);
		if(globalState.compilerOptions.mode == "project"){
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

	if(globalState.compilerOptions.mode == "project"){
		for(const filename of mlogFilelist){
			//For each filename in the other file list
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlog"){
				compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			} else {
				mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			}
		}
		Log.printMessage("assembling output", {});

		const outputData:string[] = [
			...mainData, "end", "",
			"#functions",
			...Object.values(compiledData).map(program => program.concat("end")).flat(1)
			, "",
			"#stdlib functions",
			...Object.entries(stdlibData).filter(
				([name]) => globalState.compilerOptions.include.includes(name)
			).map(([, program]) => program.concat("end")).flat(1),
			"", ...(globalState.compilerOptions.removeCompilerMark ? [] : compilerMark)
		];

		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			outputData.join("\r\n")
		);
	}
	Log.printMessage("compilation complete", {});
}

function getSettings(directory:string, ignoreMissing?:true):Settings {
	try {
		let settings:Settings;
		fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
		const settingsInFile = JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"));
		// eslint-disable-next-line prefer-const
		settings = settingsSchema.validateSync(settingsInFile, {
			stripUnknown: false
		}) as Settings;
		if("compilerVariables" in settings){
			Log.printMessage("settings.compilerVariables deprecated", {});
			settings.compilerConstants = (
				settings as Settings & {compilerVariables: typeof settings.compilerConstants}
			).compilerVariables;
		}
		return settings;
	} catch(err){
		if(err instanceof yup.ValidationError || err instanceof SyntaxError){
			Log.printMessage("invalid config.json", err);
		} else if(!ignoreMissing){
			Log.printMessage("no config.json", {});
		}
		return settingsSchema.getDefault() as Settings;
	}
}


export function compileFile(name:string, icons:Map<string, string>, options:Options){

	const extension = path.extname(name);
	if(extension == ".mlog"){
		Log.printMessage("cannot compile mlog file", {});
		return;
	}

	const settings = getSettings(path.join(name, ".."), true);
	const globalState = getState(settings, path.join(name, ".."), options);
	const state = getLocalState(globalState, name, icons);

	let outputData:string[];
	const data:string[] = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
	try {
		outputData = compileMlogxToMlog(
			data,
			state
		).outputProgram.map(s => s.text);
	} catch(err){
		Log.printMessage("compiling file failed", {filename:name});
		if(err instanceof CompilerError){
			Log.err(err.message);
		} else {
			Log.err("Unhandled error:");
			Log.dump(err);
		}
		return;
	}

	let outputFileName;
	if(name.match(/\.mlogx$/)) outputFileName = name.slice(0, -1);
	else outputFileName = name + ".out";
	fs.writeFileSync(outputFileName, outputData.join("\r\n"));
}

export async function createProject(name:string|undefined){
	if(!name){
		name = await askQuestion("Project name: ");
	}
	//If the current directory is the same as the path
	if(process.cwd().split(path.sep).at(-1)?.toLowerCase() == name.toLowerCase()){
		name = ".";
	}
	if(fs.existsSync(path.join(process.cwd(), name, "config.json"))){
		throw new Error(`Directory ${name} already has a config.json file.`);
	}
	if(/[./\\]/.test(name) && name != "."){
		throw new Error(`Name ${name} contains invalid characters.`);
	}
	const authors:string[] = (await askQuestion("Authors: ")).split(" ");
	const isSingleFiles = await askQuestion("Single files [y/n]:");
	if(!fs.existsSync(path.join(process.cwd(), name))) fs.mkdirSync(path.join(process.cwd(), name));
	if(!isSingleFiles) fs.mkdirSync(path.join(process.cwd(), name, "src"));
	fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify(settingsSchema.validateSync({
		name,
		authors,
		compilerOptions: {
			mode: isSingleFiles ? "single" : "project"
		}
	}), null, "\t"), "utf-8");
	Log.printMessage("project created", {dirname: path.join(process.cwd(), name)});
	return true;
}

