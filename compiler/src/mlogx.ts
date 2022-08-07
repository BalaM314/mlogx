/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 

Contains the mlogx Application.
*/

import { Log } from "./classes.js";
import commands from "./commands.js";
import { addJumpLabels } from "./compile.js";
import { defaultSettings } from "./consts.js";
import { Application } from "cli-app";
import chalk from "chalk";
import path from "path";
import * as fs from "fs";
import { createProject, compileDirectory, compileFile } from "./compile_fs.js";

export const mlogx = new Application("mlogx", "A Mindustry Logic transpiler.");
mlogx.command("info", "Shows information about a logic command", (opts) => {
	const command = opts.positionalArgs[0]!;
	if(command.includes(" ")){
		Log.err(`Commands cannot contain spaces.`);
		return 1;
	}
	if(!commands[command]){
		Log.err(`Unknown command "${command}"`);
		return 1;
	} else {
		Log.none(chalk.white(
`Info for command "${command}"
Usage:

${commands[command].map(
	commandDefinition => command + " " + commandDefinition.args
		.map(arg => arg.toString())
		.join(" ") + "\n" + commandDefinition.description
).join("\n\n")}
`)
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
		.catch(err => Log.err(err?.message ?? err));
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
		Log.err(`"${app.name} --init" was moved to "${app.name} init".`); return 1;
	}
	if("info" in opts.namedArgs){
		Log.err(`"${app.name} --info" was moved to "${app.name} info".`); return 1;
	}

	const target = opts.positionalArgs[0] ?? process.cwd();
	if("verbose" in opts.namedArgs){
		Log.announce("Using verbose mode");
		defaultSettings.compilerOptions.verbose = true;
	}

	if("watch" in opts.namedArgs){
		let lastCompiledTime = Date.now();
		compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
		fs.watch(target, {
			recursive: true
		}, (type, filename) => {
			if(filename?.toString().endsWith(".mlogx")){
				if(Date.now() - lastCompiledTime > 1000){//WINDOWSSSSSSS
					Log.announce(`\nFile changes detected! ${filename.toString()}`);

					const parentdirs = filename.toString().split(path.sep).slice(0, -1);
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
					Log.announce(`Compiling directory ${dirToCompile}`);


					compileDirectory(dirToCompile, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
					lastCompiledTime = Date.now();
				}
			}
		});
		return -1;
	}
	if(!fs.existsSync(target)){
		Log.err(`Invalid path specified.\nPath ${target} does not exist.`);
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		Log.announce(`Compiling folder ${target}`);
		compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
		return 0;
	} else {
		Log.announce(`Compiling file ${target}`);
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
		},
		verbose: {
			description: "Whether to be verbose and output error messages for all overloads.",
			needsValue: false
		}
	}
}, ["build"]);

mlogx.command("generate-labels", "Adds jump labels to MLOG code with hardcoded jumps.", (opts) => {
	const target = opts.positionalArgs[0];
	if(!fs.existsSync(target)){
		Log.err(`Invalid path specified.\nPath ${target} does not exist.`);
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		Log.err(`Invalid path specified.\nPath ${target} is a directory.`);
		return 1;
	} else {
		Log.none(chalk.gray(`This command was made by looking at SByte's python code.`));
		Log.announce(`Adding jump labels to file ${target}`);
		const data = fs.readFileSync(target, "utf-8").split(/\r?\n/g);
		const output = addJumpLabels(data);
		Log.announce(`Writing to ${opts.namedArgs["output"]!}`);
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