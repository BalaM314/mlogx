import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";
import { Log, CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark, defaultSettings } from "./consts.js";
import { parseIcons, getCompilerConsts, askQuestion } from "./funcs.js";
export function compileDirectory(directory, stdlibPath, defaultSettings) {
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
export function compileFile(name, settings) {
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
export async function createProject(name) {
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
