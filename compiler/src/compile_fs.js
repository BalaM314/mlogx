import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";
import * as yup from "yup";
import { CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark } from "./consts.js";
import { Log } from "./Log.js";
import { askQuestion, getCompilerConsts } from "./funcs.js";
import { settingsSchema } from "./settings.js";
export function compileDirectory(directory, stdlibPath, defaultSettings, icons) {
    const settings = getSettings(directory, defaultSettings);
    const srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();
    if (!srcDirectoryExists && settings.compilerOptions.mode == "project") {
        Log.printMessage("compiler mode project but no src directory", {});
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
        const data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                ...settings,
                filename
            }, getCompilerConsts(icons, {
                ...settings,
                filename
            })).outputProgram.map(line => line[0]);
        }
        catch (err) {
            Log.printMessage("compiling file failed", { filename });
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
            ...[].concat(...Object.values(compiledData).map(program => program.concat("end"))), "",
            "#stdlib functions",
            ...[].concat(...Object.entries(stdlibData).filter(([name]) => settings.compilerOptions.include.includes(name)).map(([, program]) => program.concat("end"))),
            "", ...(settings.compilerOptions.removeCompilerMark ? compilerMark : [])
        ];
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData.join("\r\n"));
    }
    Log.printMessage("compilation complete", {});
}
function getSettings(directory, defaultSettings) {
    try {
        let settings;
        fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
        const settingsInFile = JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"));
        settings = settingsSchema.validateSync(deepmerge(defaultSettings, settingsInFile), {
            stripUnknown: false
        });
        if ("compilerVariables" in settings) {
            Log.printMessage("settings.compilerVariables deprecated", {});
            settings.compilerConstants = settings["compilerVariables"];
        }
        return settings;
    }
    catch (err) {
        if (err instanceof yup.ValidationError || err instanceof SyntaxError) {
            Log.printMessage("invalid config.json", err);
        }
        else {
            Log.printMessage("no config.json", {});
        }
        return settingsSchema.getDefault();
    }
}
export function compileFile(name, givenSettings, icons) {
    const extension = path.extname(name);
    if (extension == ".mlog") {
        Log.printMessage("cannot compile mlog file", {});
        return;
    }
    const settingsPath = path.join(name, "../config.json");
    if (fs.existsSync(settingsPath))
        givenSettings = deepmerge(givenSettings, JSON.parse(fs.readFileSync(settingsPath, "utf-8")));
    const data = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
    let outputData;
    const settings = settingsSchema.validateSync({
        filename: name,
        ...givenSettings
    });
    try {
        outputData = compileMlogxToMlog(data, settings, getCompilerConsts(icons, settings)).outputProgram.map(line => line[0]);
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
