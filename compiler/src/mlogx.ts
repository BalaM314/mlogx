/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains the mlogx Application.
*/

import chalk from "chalk";
import * as fs from "fs";
import path from "path";
import * as os from "os";
import { Application } from "cli-app";
import { argToString, GenericArgs } from "./args.js";
import { commands, compilerCommands } from "./commands.js";
import { addJumpLabels, portCode } from "./compile.js";
import { compileDirectory, compileFile, createProject } from "./compile_fs.js";
import { isKey, parseIcons } from "./funcs.js";
import { Log } from "./Log.js";
import { PortingMode } from "./types.js";

export const mlogx = new Application("mlogx", "A Mindustry Logic transpiler.");
mlogx.command("info", "Shows information about a logic command or arg type", (opts) => {
	const name = opts.positionalArgs[0];
	const commandName = name + (opts.positionalArgs[1] ? " " + opts.positionalArgs[1] : "");
	if(name.includes(" ")){
		Log.printMessage("commands cannot contain spaces", {});
		return 1;
	}
	if(isKey(commands, name)){
		const matchingCommands = commands[name].filter(c => opts.positionalArgs[1] ? c.args[0].type.startsWith(opts.positionalArgs[1]) : true);
		if(matchingCommands.length == 0){
			Log.none(chalk.red(
`No commands found for "${commandName}".`
			));
		}
		Log.none(chalk.white(
`Info for command "${commandName}"
Usage:

${matchingCommands.map(commandDefinition =>
	name + " " + commandDefinition.args
		.map(argToString)
		.join(" ") + "\n" + commandDefinition.description
).join("\n\n")}
`)
		);
		return 0;
	} else if(isKey(compilerCommands, name)){
		Log.none(chalk.white(
`Info for compiler command "${name}"
Usage:

${compilerCommands[name].overloads.map(commandDefinition =>
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

${arg.description ?? ""}
Accepts:
${arg.validator instanceof Array ? arg.validator.map(thing => thing instanceof RegExp ? `* Any string matching the regex /${thing.source}/` : `* "${thing}"`).join("\n") : `* Anything accepted by the function ${arg.validator.toString()}`}
`
		));
		return 0;
	} else {
		Log.printMessage("unknown command or gat", {name});
		return 1;
	}


}, false, {
	namedArgs: {},
	positionalArgs: [
		{
			name: "command",
			description: "The command to get information about",
			required: true,
		},{
			name: "subcommand",
			description: "A subcommand, such as 'itemTake' for 'ucontrol itemTake'.",
			required: false
		},
	]
}, ["i"]);

mlogx.command("version", "Displays the version of mlogx", (opts, app) => {
	try {
		const packageJsonFilepath = fs.existsSync(path.join(app.sourceDirectory, "package.json")) ? path.join(app.sourceDirectory, "package.json") : path.join(app.sourceDirectory, "../package.json");
		const packageJsonData = JSON.parse(fs.readFileSync(packageJsonFilepath, 'utf-8'));
		Log.none(chalk.blue(`MLOGX v${chalk.cyan(packageJsonData.version)}`));
	} catch(err){
		Log.err(`This should not happen. ${(err as Error).message}`);
	}
}, false, {}, ["v"]);

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
		Log.printMessage("command moved", {appname: app.name, command: "init"});
		return 1;
	}
	if("info" in opts.namedArgs){
		Log.printMessage("command moved", {appname: app.name, command: "info"});
		return 1;
	}

	const target = path.resolve(opts.positionalArgs[0] ?? process.cwd());
	if(target == os.homedir() || target == path.resolve("/")){
		Log.printMessage("cannot compile dir", {dirname: "your home directory"});
		return 1;
	}
	if(target == app.sourceDirectory || target == path.join(app.sourceDirectory, "src")){
		Log.printMessage("cannot compile dir", {dirname: "mlogx's installation location"});
		return 1;
	}
	const stdlibDirectory = fs.existsSync(path.join(app.sourceDirectory, "stdlib")) ? path.join(app.sourceDirectory, "stdlib") : path.join(app.sourceDirectory, "../stdlib");
	const cacheDirectory = fs.existsSync(path.join(app.sourceDirectory, "cache")) ? path.join(app.sourceDirectory, "cache") : path.join(app.sourceDirectory, "../cache");
	const icons = parseIcons(fs.readFileSync(path.join(cacheDirectory, "icons.properties"), "utf-8").split(/\r?\n/));
	
	if("verbose" in opts.namedArgs){
		Log.printMessage("verbose mode on", {});
	}
	if("watch" in opts.namedArgs){
		let lastCompiledTime = Date.now();
		compileDirectory(target, stdlibDirectory, icons, opts);
		fs.watch(target, {
			recursive: true
		}, (type, filename) => {
			if(filename?.toString().endsWith(".mlogx")){
				if(Date.now() - lastCompiledTime > 1000){//WINDOWSSSSSSS
					Log.printMessage("file changes detected", {filename});

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
					Log.printMessage("compiling folder", {name: dirToCompile});


					compileDirectory(dirToCompile, stdlibDirectory, icons, opts);
					lastCompiledTime = Date.now();
				}
			}
		});
		return -1;
	}
	if(!fs.existsSync(target)){
		Log.printMessage("invalid path", {name: target});
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		Log.printMessage("compiling folder", {name: target});
		compileDirectory(target, stdlibDirectory, icons, opts);
		return 0;
	} else {
		Log.printMessage("compiling file", {filename: target});
		compileFile(target, icons, opts);
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
			needsValue: false,
			aliases: ["w"]
		},
		verbose: {
			description: "Whether to be verbose and output error messages for all overloads.",
			needsValue: false,
			aliases: ["v"]
		}
	}
}, ["build"]);

mlogx.command("generate-labels", "Adds jump labels to MLOG code with hardcoded jumps.", (opts) => {
	const target = opts.positionalArgs[0];
	if(!fs.existsSync(target)){
		Log.printMessage("invalid path", {name: target});
		return 1;
	}
	if(fs.lstatSync(target).isDirectory()){
		Log.printMessage("invalid path", {name: target, reason: "is a directory"});
		return 1;
	} else {
		Log.printMessage("adding jump labels", {filename: target});
		const data = fs.readFileSync(target, "utf-8").split(/\r?\n/g);
		const output = addJumpLabels(data);
		Log.printMessage("writing to", {outPath: opts.namedArgs["output"]!});
		fs.writeFileSync(opts.namedArgs["output"]!, output.join("\r\n"));
		return 0;
	}
}, false, {
	namedArgs: {
		output: {
			description: "Output file path",
			required: true,
			aliases: ["out", "o"]
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
			Log.printMessage("invalid path", {name: outputPath, reason: "does not exist or cannot be written to"});
		}
		return 1;
	}
	if(sourcePath.endsWith(".mlogx")){
		Log.printMessage("cannot port mlogx", {path: sourcePath});
		return 1;
	}
	const program = fs.readFileSync(sourcePath, "utf-8").split(/\r?\n/g);
	const portedProgram = portCode(program, PortingMode.shortenSyntax);
	fs.writeFileSync(outputPath, portedProgram.join("\r\n"), "utf-8");
	Log.printMessage("port successful", {filename: sourcePath});
	return 0;
}, false, {
	namedArgs: {
		output: {
			description: "Output file path",
			aliases: ["out", "o"]
		}
	},
	positionalArgs: [{
		name: "source",
		description: "File containing the MLOG code to be ported",
		required: true
	}]
});
