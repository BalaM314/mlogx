import * as fs from "fs";
import path from "path";
import * as yup from "yup";
import { CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark } from "./consts.js";
import { Log } from "./Log.js";
import { askQuestion, getLocalState, getState } from "./funcs.js";
import { settingsSchema } from "./settings.js";
export function compileDirectory(directory, stdlibPath, icons, options) {
    const settings = getSettings(directory);
    const globalState = getState(settings, directory, options);
    const srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();
    if (!srcDirectoryExists && globalState.compilerOptions.mode == "project") {
        Log.printMessage("compiler mode project but no src directory", {});
        globalState.compilerOptions.mode = "single";
    }
    if (srcDirectoryExists) {
        globalState.compilerOptions.mode = "project";
    }
    const sourceDirectory = globalState.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
    const outputDirectory = globalState.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
    const stdlibDirectory = path.join(stdlibPath, "build");
    if (globalState.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    const mlogxFilelist = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
    const mlogFilelist = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
    const stdlibFilelist = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
    const compiledData = {};
    let mainData = [];
    const stdlibData = {};
    Log.printMessage("files to compile", mlogxFilelist);
    for (const filename of stdlibFilelist) {
        stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
    }
    for (const filename of mlogxFilelist) {
        Log.printMessage("compiling file", { filename });
        const state = getLocalState(globalState, filename, icons);
        const data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, state).outputProgram.map(s => s.text);
        }
        catch (err) {
            Log.printMessage("compiling file failed", { filename });
            if (err instanceof CompilerError)
                Log.err(err.message);
            else
                Log.dump(err);
            return;
        }
        if (globalState.compilerOptions.mode == "single" && !globalState.compilerOptions.removeCompilerMark) {
            outputData.push("end", ...compilerMark);
        }
        fs.writeFileSync(path.join(outputDirectory, filename.replace(/\.mlogx$/, ".mlog")), outputData.join("\r\n"));
        if (globalState.compilerOptions.mode == "project") {
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
    if (globalState.compilerOptions.mode == "project") {
        for (const filename of mlogFilelist) {
            if (filename != "main.mlog") {
                compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
            else {
                mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
        }
        Log.printMessage("assembling output", {});
        const outputData = [
            ...mainData, "end", "",
            "#functions",
            ...Object.values(compiledData).map(program => program.concat("end")).flat(1),
            "",
            "#stdlib functions",
            ...Object.entries(stdlibData).filter(([name]) => globalState.compilerOptions.include.includes(name)).map(([, program]) => program.concat("end")).flat(1),
            "", ...(globalState.compilerOptions.removeCompilerMark ? [] : compilerMark)
        ];
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData.join("\r\n"));
    }
    Log.printMessage("compilation complete", {});
}
export function getSettings(directory, ignoreMissing) {
    try {
        let settings;
        fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
        const settingsInFile = JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"));
        settings = settingsSchema.validateSync(settingsInFile, {
            stripUnknown: false
        });
        if ("compilerVariables" in settings) {
            Log.printMessage("settings.compilerVariables deprecated", {});
            settings.compilerConstants = settings.compilerVariables;
        }
        return settings;
    }
    catch (err) {
        if (err instanceof yup.ValidationError || err instanceof SyntaxError) {
            Log.printMessage("invalid config.json", err);
        }
        else if (!ignoreMissing) {
            Log.printMessage("no config.json", {});
        }
        return settingsSchema.getDefault();
    }
}
export function compileFile(name, icons, options) {
    const extension = path.extname(name);
    if (extension == ".mlog") {
        Log.printMessage("cannot compile mlog file", {});
        return;
    }
    const settings = getSettings(path.join(name, ".."), true);
    const globalState = getState(settings, path.join(name, ".."), options);
    const state = getLocalState(globalState, name, icons);
    let outputData;
    const data = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
    try {
        outputData = compileMlogxToMlog(data, state).outputProgram.map(s => s.text);
    }
    catch (err) {
        Log.printMessage("compiling file failed", { filename: name });
        if (err instanceof CompilerError) {
            Log.err(err.message);
        }
        else {
            Log.err("Unhandled error:");
            Log.dump(err);
        }
        return;
    }
    let outputFileName;
    if (name.match(/\.mlogx$/))
        outputFileName = name.slice(0, -1);
    else
        outputFileName = name + ".out";
    fs.writeFileSync(outputFileName, outputData.join("\r\n"));
}
export async function createProject(name) {
    if (!name) {
        name = await askQuestion("Project name: ");
    }
    if (process.cwd().split(path.sep).at(-1)?.toLowerCase() == name.toLowerCase()) {
        name = ".";
    }
    if (fs.existsSync(path.join(process.cwd(), name, "config.json"))) {
        throw new Error(`Directory ${name} already has a config.json file.`);
    }
    if (/[./\\]/.test(name) && name != ".") {
        throw new Error(`Name ${name} contains invalid characters.`);
    }
    const authors = (await askQuestion("Authors: ")).split(" ");
    const isSingleFiles = await askQuestion("Single files [y/n]:");
    if (!fs.existsSync(path.join(process.cwd(), name)))
        fs.mkdirSync(path.join(process.cwd(), name));
    if (!isSingleFiles)
        fs.mkdirSync(path.join(process.cwd(), name, "src"));
    fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify(settingsSchema.validateSync({
        name,
        authors,
        compilerOptions: {
            mode: isSingleFiles ? "single" : "project"
        }
    }), null, "\t"), "utf-8");
    Log.printMessage("project created", { dirname: path.join(process.cwd(), name) });
    return true;
}
