/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains impure functions related to compiling that interact with the filesystem.
*/

import * as fs from "fs";
import * as yup from "yup";
import path from "path";
import deepmerge from "deepmerge";
import { Log, CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark, settingsSchema } from "./consts.js";
import { getCompilerConsts, askQuestion } from "./funcs.js";
import { PartialRecursive, Settings } from "./types";

export function compileDirectory(directory:string, stdlibPath:string, defaultSettings:PartialRecursive<Settings>, icons:Map<string, string>){
	let settings:Settings;
	try {
		fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
		const settingsInFile = JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"));
		settings = settingsSchema.validateSync(deepmerge(defaultSettings, settingsInFile), {
			stripUnknown: false
		}) as Settings;
		if("compilerVariables" in settings){
			Log.warn(`settings.compilerVariables is deprecated, please use settings.compilerConstants instead.`);
			settings.compilerConstants = (settings as Settings & {compilerVariables: typeof settings.compilerConstants})["compilerVariables"];
		}
		
	} catch(err){
		if(err instanceof yup.ValidationError || err instanceof SyntaxError){
			Log.err(`config.json file is invalid. (${err.message}) Using default settings.`);
		} else {
			Log.debug("No config.json found, using default settings.");
		}
		settings = settingsSchema.getDefault() as Settings;
	}

	const srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();

	if(!srcDirectoryExists && settings.compilerOptions.mode == "project"){
		Log.warn(`Compiler mode set to "project" but no src directory found.`);
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
	const filelist_mlogx:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	const filelist_mlog:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
	const filelist_stdlib:string[] = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
	Log.announce("Files to compile: ", filelist_mlogx);

	const compiledData: {
		[index: string]: string[];
	} = {};
	let mainData: string[] = [];
	const stdlibData: {
		[index: string]: string[];
	} = {};

	for(const filename of filelist_stdlib){
		//For each filename in the stdlib
		// Load the file into stdlibData
		stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
	}

	for(const filename of filelist_mlogx){
		//For each filename in the file list

		Log.announce(`Compiling file ${filename}`);
		const data:string[] = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
		//Load the data
		
		let outputData: string[];
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(data,
				{
					...settings,
					filename
				},
				getCompilerConsts(icons, {
					...settings,
					filename
				})
			);
		} catch(err){
			Log.err(`Failed to compile file ${filename}!`);
			if(err instanceof CompilerError)
				Log.err(err.message);
			else
				Log.dump(err);
			return;
		}
		if(settings.compilerOptions.mode == "single" && !settings.compilerOptions.removeCompilerMark){
			outputData.push("end", ...compilerMark);
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
		for(const filename of filelist_mlog){
			//For each filename in the other file list
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlog"){
				compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			} else {
				mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			}
		}
		Log.announce("Compiled all files successfully.");
		Log.announce("Assembling output:");

		const outputData:string[] = [
			...mainData, "end", "",
			"#functions",
			//bizzare hack to use spread operator twice
			...([] as string[]).concat(...
			Object.values(compiledData).map(program => program.concat("end"))
			), "",
			"#stdlib functions",
			...([] as string[]).concat(
				...Object.entries(stdlibData).filter(
					([name]) => settings.compilerOptions.include.includes(name)
				).map(([, program]) => program.concat("end"))
			),
			"", ...(settings.compilerOptions.removeCompilerMark ? compilerMark : [])
		];

		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			outputData.join("\r\n")
		);
	}
	Log.announce("Done!");
}

export function compileFile(name:string, givenSettings:PartialRecursive<Settings>, icons:Map<string, string>){

	const data:string[] = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
	let outputData:string[];
	const settings = settingsSchema.validateSync({
		filename: name,
		...givenSettings
	}) as Settings;
	try {
		outputData = compileMlogxToMlog(
			data,
			settings,
			getCompilerConsts(icons, settings)
		);
	} catch(err){
		Log.err(`Failed to compile file ${name}!`);
		if(err instanceof CompilerError){
			Log.err(err.message);
		} else {
			Log.err("Unhandled error:");
			Log.dump(err);
		}
		return;
	}

	fs.writeFileSync(name.slice(0, -1), outputData.join("\r\n"));
}

export async function createProject(name:string|undefined){
	if(!name){
		name = await askQuestion("Project name: ");
	}
	//If the current directory is the same as the path
	if(process.cwd().split(path.sep).at(-1)?.toLowerCase() == name.toLowerCase()){
		name = ".";
	}
	if(fs.existsSync(path.join(process.cwd(), name))){
		throw new Error(`Directory ${name} already exists.`);
	}
	if(/[./\\]/.test(name) && name != "."){
		throw new Error(`Name ${name} contains invalid characters.`);
	}
	const authors:string[] = (await askQuestion("Authors: ")).split(" ");
	const isSingleFiles = await askQuestion("Single files [y/n]:");
	fs.mkdirSync(path.join(process.cwd(), name));
	if(!isSingleFiles) fs.mkdirSync(path.join(process.cwd(), name, "src"));
	fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify(settingsSchema.validateSync({
		name,
		authors,
		compilerOptions: {
			mode: isSingleFiles ? "single" : "project"
		}
	}), null, "\t"), "utf-8");
	Log.announce(`Successfully created a new project in ${path.join(process.cwd(), name)}`);
	return true;
}

