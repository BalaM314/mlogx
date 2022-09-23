/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains the mlogx Application.
*/

import chalk from "chalk";
import { Application } from "cli-app";
import * as fs from "fs";
import path from "path";
import { argToString, GenericArgs } from "./args.js";
import { commands } from "./commands.js";
import { addJumpLabels, portCode } from "./compile.js";
import { compileDirectory, compileFile, createProject } from "./compile_fs.js";
import { Log } from "./Log.js";
import { isKey, parseIcons } from "./funcs.js";
import { Settings } from "./settings.js";
import { PartialRecursive, PortingMode } from "./types.js";

export const mlogx = new Application("mlogx", "A Mindustry Logic transpiler.");
mlogx.command("info", "Shows information about a logic command", (opts) => {
	const name = opts.positionalArgs[0]!;
	if(name.includes(" ")){
		Log.err(`Commands cannot contain spaces.`);
		return 1;
	}
	if(isKey(commands, name)){
		Log.none(chalk.white(
`Info for command "${name}"
Usage:

${commands[name].map(commandDefinition =>
	name + " " + commandDefinition.args
		.map(argToString)
		.join(" ") + "\n" + commandDefinition.description
).join("\n\n")}
`)
		);
		return 0;
	} else if(isKey(GenericArgs, name)){
		const arg = GenericArgs.get(name)!;
		Log.none(chalk.white(
`Info for generic arg type ${name}:

Accepts:
${arg.validator instanceof Array ? arg.validator.map(thing => thing instanceof RegExp ? `* Any string matching the regex /${thing.source}/` : `* "${thing}"`).join("\n") : `Anything accepted by the function ${arg.validator.toString()}`}
`
		));
		return 0;
	} else {
		Log.err(`Unknown command or generic arg type "${name}"`);
		return 1;
	}


}, false, {
	namedArgs: {},
	positionalArgs: [{
		name: "command",
		description: "The command to get information about"
	}]
}, ["i"]);

mlogx.command("version", "Displays the version of mlogx", (opts, app) => {
	try {
		const packageJsonFilepath = fs.existsSync(path.join(app.sourceDirectory, "package.json")) ? path.join(app.sourceDirectory, "package.json") : path.join(app.sourceDirectory, "../package.json");
		const packageJsonData = JSON.parse(fs.readFileSync(packageJsonFilepath, 'utf-8'));
		Log.none(chalk.blue(`MLOGX v${chalk.cyan(packageJsonData.version)}`));
	} catch(err){
		Log.err(`This should not happen. ${(err as Error).message}`);
	}
}, false, undefined, ["v"]);

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
	const settingsOverrides:PartialRecursive<Settings> = {
		compilerOptions: {
			verbose: "verbose" in opts.namedArgs
		}
	};
	const stdlibDirectory = fs.existsSync(path.join(app.sourceDirectory, "stdlib")) ? path.join(app.sourceDirectory, "stdlib") : path.join(app.sourceDirectory, "../stdlib");
	const cacheDirectory = fs.existsSync(path.join(app.sourceDirectory, "cache")) ? path.join(app.sourceDirectory, "cache") : path.join(app.sourceDirectory, "../cache");
	const icons = parseIcons(fs.readFileSync(path.join(cacheDirectory, "icons.properties"), "utf-8").split(/\r?\n/));
	
	if(settingsOverrides.compilerOptions?.verbose){
		Log.announce("Using verbose mode");
	}
	if("watch" in opts.namedArgs){
		let lastCompiledTime = Date.now();
		compileDirectory(target, stdlibDirectory, settingsOverrides, icons);
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


					compileDirectory(dirToCompile, stdlibDirectory, settingsOverrides, icons);
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
		compileDirectory(target, stdlibDirectory, settingsOverrides, icons);
		return 0;
	} else {
		Log.announce(`Compiling file ${target}`);
		compileFile(target, settingsOverrides, icons);
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
		Log.none(chalk.gray(`This command was made possible by looking at SByte's python code.`));
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

mlogx.command("port", "Ports MLOG code.", (opts) => {
	const sourcePath = opts.positionalArgs[0];
	const outputPath = opts.namedArgs.output ?? (sourcePath.endsWith(".mlog") ? sourcePath + "x" : sourcePath + ".mlogx");
	try {
		fs.accessSync(sourcePath, fs.constants.W_OK);
	} catch(err){
		if((err as Error).message.startsWith("ENOENT")){
			Log.err(`Filepath "${sourcePath}" does not exist or cannot be written to.`);
		}
		return 1;
	}
	if(sourcePath.endsWith(".mlogx")){
		Log.err(`File ${sourcePath} is already mlogx. If you would like to port it again, please rename it to .mlog`);
		return 1;
	}
	const program = fs.readFileSync(sourcePath, "utf-8").split(/\r?\n/g);
	const portedProgram = portCode(program, PortingMode.shortenSyntax);
	fs.writeFileSync(outputPath, portedProgram.join("\r\n"), "utf-8");
	Log.announce(`Ported file ${sourcePath} to mlogx.`);
	return 0;
}, false, {
	namedArgs: {
		output: {
			description: "Output file path"
		}
	},
	positionalArgs: [{
		name: "source",
		description: "File containing the MLOG code to be ported",
		required: true
	}]
});
