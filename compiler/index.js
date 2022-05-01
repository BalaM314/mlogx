import * as path from "path";
import * as fs from "fs";
import commands from "./commands.js";
import { compileMlogxToMlog } from "./compile.js";
import { parseArgs, askQuestion } from "./funcs.js";
import { defaultSettings, compilerMark } from "./consts.js";
import { CompilerError } from "./classes.js";
function main(processArgs) {
    const [programArgs, fileNames] = parseArgs(processArgs.slice(2));
    if (programArgs["help"]) {
        console.log(`Usage: compile [--help] [--directory <directory>] [--info <command>] directory
\t--help\tDisplays this help message and exits.
\t--info\tShows information about a command.
directory: The directory to compile in.
`);
        return 0;
    }
    if (programArgs["info"]) {
        if (programArgs["info"] == "null") {
            console.log("Please specify a command to get information on.");
            return 0;
        }
        if (!commands[programArgs["info"]])
            console.log(`Unknown command ${programArgs["info"]}`);
        else
            console.log(`${programArgs["info"]}
Usage:

${commands[programArgs["info"]].map(command => programArgs["info"] + " " + command.args
                .map(arg => arg.toString())
                .join(" ") + "\n" + command.description).join("\n\n")}
`);
        return 0;
    }
    if (programArgs["init"]) {
        createProject(programArgs["init"])
            .catch(err => console.error(err?.message ?? err));
        return -1;
    }
    if (fileNames[0] == undefined) {
        console.error("Please specify a project or directory to compile in");
        return 1;
    }
    try {
        if (fs.existsSync(fileNames[0]) && fs.lstatSync(fileNames[0]).isDirectory()) {
            console.log("Compiling folder " + fileNames[0]);
        }
        else {
            console.error("Invalid directory specified!");
            return 1;
        }
    }
    catch (err) {
        console.error("Invalid directory specified.");
        return 1;
    }
    compileDirectory(fileNames[0]);
    return 0;
}
function compileDirectory(directory) {
    let settings = defaultSettings;
    try {
        fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
        settings = {
            ...settings,
            ...JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"))
        };
    }
    catch (err) {
        console.log("No config.json found, using default settings.");
    }
    let srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();
    if (!srcDirectoryExists && settings.compilerOptions.mode == "project") {
        console.error(`Compiler mode set to "project" but no src directory found.`);
        settings.compilerOptions.mode = "single";
    }
    if (srcDirectoryExists) {
        settings.compilerOptions.mode = "project";
    }
    const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
    const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
    if (settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    let filelist_mlogx = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlogx$/));
    let filelist_mlog = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlog$/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let mainData = "";
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split("\r\n");
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                filename,
                ...settings
            }).join("\r\n");
        }
        catch (err) {
            console.error(`Failed to compile file ${filename}!`);
            if (err instanceof CompilerError)
                console.error(err.message);
            else
                console.error(err);
            return;
        }
        if (settings.compilerOptions.mode == "single") {
            outputData += "\r\nend\r\n" + compilerMark;
        }
        fs.writeFileSync(path.join(outputDirectory, filename.slice(0, -1)), outputData);
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
        for (let filename of filelist_mlog) {
            if (filename != "main.mlog") {
                compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8');
            }
            else {
                mainData = fs.readFileSync(`src/${filename}`, 'utf-8');
            }
        }
        console.log("Compiled all files successfully.");
        console.log("Assembling output:");
        let outputData = mainData;
        outputData += "\r\nend\r\n#functions\r\n\r\n" + Object.values(compiledData).join("\r\nend\r\n\r\n");
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData);
        console.log("Done!");
    }
    else {
        console.log("Done!");
    }
}
async function createProject(name) {
    if (name == "null") {
        name = await askQuestion("Project name: ");
    }
    if (fs.existsSync(path.join(process.cwd(), name))) {
        throw new Error(`Directory ${name} already exists.`);
    }
    if (/[\.\/\\]/.test(name)) {
        throw new Error(`Name ${name} contains invalid characters.`);
    }
    const authors = (await askQuestion("Authors: ")).split(" ");
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
    }), "utf-8");
    console.log(`Successfully created a new project in ${path.join(process.cwd(), name)}`);
    return true;
}
try {
    main(process.argv);
}
catch (err) {
    console.error("Unhandled runtime error!");
    console.error(err);
    console.error("Please report this to BalaM314 by pinging him on discord.");
    process.exit(1);
}
