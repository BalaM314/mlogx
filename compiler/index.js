#!/usr/bin/env node
import { commands } from "./commands.js";
import { compileMlogxToMlog, addJumpLabels } from "./compile.js";
import { askQuestion, parseIcons, getCompilerConsts } from "./funcs.js";
import { defaultSettings, compilerMark } from "./consts.js";
import { CompilerError, Log } from "./classes.js";
import { Application } from "cli-app";
import * as path from "path";
import * as fs from "fs";
import chalk from "chalk";
import deepmerge from "deepmerge";
const mlogx = new Application("mlogx", "A Mindustry Logic transpiler.");
mlogx.command("info", "Shows information about a logic command", (opts) => {
    const command = opts.positionalArgs[0];
    if (command.includes(" ")) {
        Log.err(`Commands cannot contain spaces.`);
        return 1;
    }
    if (!commands[command]) {
        Log.err(`Unknown command "${command}"`);
        return 1;
    }
    else {
        Log.none(chalk.white(`Info for command "${command}"
Usage:

${commands[command].map(commandDefinition => command + " " + commandDefinition.args
            .map(arg => arg.toString())
            .join(" ") + "\n" + commandDefinition.description).join("\n\n")}
`));
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
    createProject(opts.positionalArgs[0])
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
    if ("init" in opts.namedArgs) {
        Log.err(`"${app.name} --init" was moved to "${app.name} init".`);
        return 1;
    }
    if ("info" in opts.namedArgs) {
        Log.err(`"${app.name} --info" was moved to "${app.name} info".`);
        return 1;
    }
    const target = opts.positionalArgs[0] ?? process.cwd();
    if ("verbose" in opts.namedArgs) {
        Log.announce("Using verbose mode");
        defaultSettings.compilerOptions.verbose = true;
    }
    if ("watch" in opts.namedArgs) {
        let lastCompiledTime = Date.now();
        compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
        fs.watch(target, {
            recursive: true
        }, (type, filename) => {
            if (filename?.toString().endsWith(".mlogx")) {
                if (Date.now() - lastCompiledTime > 1000) {
                    Log.announce(`\nFile changes detected! ${filename.toString()}`);
                    const parentdirs = filename.toString().split(path.sep).slice(0, -1);
                    let dirToCompile;
                    if (parentdirs.at(-1) != undefined) {
                        if (parentdirs.at(-1) == "src") {
                            if (parentdirs.at(-2)) {
                                dirToCompile = parentdirs.slice(0, -1).join(path.sep);
                            }
                            else {
                                dirToCompile = process.cwd();
                            }
                        }
                        else {
                            dirToCompile = parentdirs.join(path.sep);
                        }
                    }
                    else {
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
    if (!fs.existsSync(target)) {
        Log.err(`Invalid path specified.\nPath ${target} does not exist.`);
        return 1;
    }
    if (fs.lstatSync(target).isDirectory()) {
        Log.announce(`Compiling folder ${target}`);
        compileDirectory(target, path.join(app.sourceDirectory, "../stdlib"), defaultSettings);
        return 0;
    }
    else {
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
    if (!fs.existsSync(target)) {
        Log.err(`Invalid path specified.\nPath ${target} does not exist.`);
        return 1;
    }
    if (fs.lstatSync(target).isDirectory()) {
        Log.err(`Invalid path specified.\nPath ${target} is a directory.`);
        return 1;
    }
    else {
        Log.none(chalk.gray(`This command was made by looking at SByte's python code.`));
        Log.announce(`Adding jump labels to file ${target}`);
        const data = fs.readFileSync(target, "utf-8").split(/\r?\n/g);
        const output = addJumpLabels(data);
        Log.announce(`Writing to ${opts.namedArgs["output"]}`);
        fs.writeFileSync(opts.namedArgs["output"], output.join("\r\n"));
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
function main(argv) {
    mlogx.run(argv);
}
function compileDirectory(directory, stdlibPath, defaultSettings) {
    let settings = defaultSettings;
    try {
        fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
        settings = deepmerge(defaultSettings, JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8")));
        if ("compilerVariables" in settings) {
            Log.warn(`settings.compilerVariables is deprecated, please use settings.compilerConstants instead.`);
            settings.compilerConstants = settings["compilerVariables"];
        }
    }
    catch (err) {
        Log.debug("No valid config.json found, using default settings.");
    }
    const icons = parseIcons(fs.readFileSync(path.join(process.argv[1], "../cache/icons.properties"), "utf-8").split(/\r?\n/));
    const srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();
    if (!srcDirectoryExists && settings.compilerOptions.mode == "project") {
        Log.warn(`Compiler mode set to "project" but no src directory found.`);
        settings.compilerOptions.mode = "single";
    }
    if (srcDirectoryExists) {
        settings.compilerOptions.mode = "project";
    }
    const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
    const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
    const stdlibDirectory = path.join(stdlibPath, "build");
    if (settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    const filelist_mlogx = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
    const filelist_mlog = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
    const filelist_stdlib = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
    Log.announce("Files to compile: ", filelist_mlogx);
    const compiledData = {};
    let mainData = [];
    const stdlibData = {};
    for (const filename of filelist_stdlib) {
        stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
    }
    for (const filename of filelist_mlogx) {
        Log.announce(`Compiling file ${filename}`);
        const data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                filename,
                ...settings
            }, getCompilerConsts(icons, {
                ...settings,
                filename
            }));
        }
        catch (err) {
            Log.err(`Failed to compile file ${filename}!`);
            if (err instanceof CompilerError)
                Log.err(err.message);
            else
                Log.dump(err);
            return;
        }
        if (settings.compilerOptions.mode == "single" && !settings.compilerOptions.removeCompilerMark) {
            outputData.push("end", ...compilerMark);
        }
        fs.writeFileSync(path.join(outputDirectory, filename.slice(0, -1)), outputData.join("\r\n"));
        if (settings.compilerOptions.mode == "project") {
            if (data.includes("#program_type never"))
                continue;
            if (filename != "main.mlogx") {
                compiledData[filename] = outputData;
            }
            else {
                mainData = outputData;
            }
        }
    }
    if (settings.compilerOptions.mode == "project") {
        for (const filename of filelist_mlog) {
            if (filename != "main.mlog") {
                compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
            else {
                mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
        }
        Log.announce("Compiled all files successfully.");
        Log.announce("Assembling output:");
        const outputData = [
            ...mainData, "end", "",
            "#functions",
            ...[].concat(...Object.values(compiledData).map(program => program.concat("end"))), "",
            "#stdlib functions",
            ...[].concat(...Object.entries(stdlibData).filter(([name]) => settings.compilerOptions.include.includes(name)).map(([, program]) => program.concat("end"))),
            "", ...(settings.compilerOptions.removeCompilerMark ? compilerMark : [])
        ];
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData.join("\r\n"));
    }
    Log.announce("Done!");
}
function compileFile(name, settings) {
    const icons = parseIcons(fs.readFileSync(path.join(process.argv[1], "../cache/icons.properties"), "utf-8").split(/\r?\n/));
    const data = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
    let outputData;
    try {
        outputData = compileMlogxToMlog(data, {
            filename: name,
            ...settings
        }, getCompilerConsts(icons, {
            ...settings,
            filename: name
        }));
    }
    catch (err) {
        Log.err(`Failed to compile file ${name}!`);
        if (err instanceof CompilerError) {
            Log.err(err.message);
        }
        else {
            Log.err("Unhandled error:");
            Log.dump(err);
        }
        return;
    }
    fs.writeFileSync(name.slice(0, -1), outputData.join("\r\n"));
}
async function createProject(name) {
    if (!name) {
        name = await askQuestion("Project name: ");
    }
    if (process.cwd().split(path.sep).at(-1)?.toLowerCase() == name.toLowerCase()) {
        name = ".";
    }
    if (fs.existsSync(path.join(process.cwd(), name))) {
        throw new Error(`Directory ${name} already exists.`);
    }
    if (/[./\\]/.test(name) && name != ".") {
        throw new Error(`Name ${name} contains invalid characters.`);
    }
    const authors = (await askQuestion("Authors: ")).split(" ");
    const isSingleFiles = await askQuestion("Single files [y/n]:");
    fs.mkdirSync(path.join(process.cwd(), name));
    fs.mkdirSync(path.join(process.cwd(), name, "src"));
    fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify({
        ...defaultSettings,
        name,
        authors,
        compilerOptions: {
            ...defaultSettings.compilerOptions,
            mode: isSingleFiles ? "single" : "project"
        }
    }, null, "\t"), "utf-8");
    Log.announce(`Successfully created a new project in ${path.join(process.cwd(), name)}`);
    return true;
}
try {
    main(process.argv);
}
catch (err) {
    Log.fatal("Unhandled runtime error!");
    Log.dump(err);
    Log.fatal("Please report this to BalaM314 by pinging him on discord.");
    process.exit(1);
}
