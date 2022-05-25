import * as path from "path";
import * as fs from "fs";
import commands from "./commands.js";
import { checkTypes, compileMlogxToMlog } from "./compile.js";
import { parseArgs, askQuestion, parseIcons } from "./funcs.js";
import { defaultSettings, compilerMark } from "./consts.js";
import { CompilerError } from "./classes.js";
function main(processArgs) {
    const [programArgs, fileNames] = parseArgs(processArgs.slice(2));
    if (programArgs["help"] || programArgs["?"]) {
        console.log(`Usage: mlogx [--help] [--directory <directory>] [--info <command>] [--init <projectname>] directory
  --help -?\tDisplays this help message and exits.
  --info -i\tShows information about a command.
  --init -n\tCreates a new project.\
`);
        return 0;
    }
    if (programArgs["info"] || programArgs["i"]) {
        let command = programArgs["info"] ?? programArgs["i"];
        if (command == "null") {
            console.log("Please specify a command to get information on.");
            return 0;
        }
        if (!commands[command])
            console.log(`Unknown command ${command}`);
        else
            console.log(`${command}
Usage:

${commands[command].map(commandDefinition => command + " " + commandDefinition.args
                .map(arg => arg.toString())
                .join(" ") + "\n" + commandDefinition.description).join("\n\n")}
`);
        return 0;
    }
    if (programArgs["init"] || programArgs["n"]) {
        createProject(programArgs["init"] ?? programArgs["n"])
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
    compileDirectory(fileNames[0], path.join(processArgs[1], "../../stdlib"), defaultSettings);
    return 0;
}
function compileDirectory(directory, stdlibPath, settings) {
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
    let icons = parseIcons(fs.readFileSync(path.join(process.argv[1], "../cache/icons.properties"), "utf-8").split(/\r?\n/));
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
    const stdlibDirectory = path.join(stdlibPath, "build");
    if (settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    let filelist_mlogx = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
    let filelist_mlog = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
    let filelist_stdlib = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let mainData = [];
    let stdlibData = {};
    for (let filename of filelist_stdlib) {
        stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
    }
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                filename,
                ...settings
            }, {
                ...icons,
                filename: filename.split(".")[0],
                name: settings.name,
                authors: settings.authors.join(", "),
                ...settings.compilerVariables,
            });
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
            outputData.push("end", ...compilerMark);
            if (settings.compilerOptions.checkTypes) {
                try {
                    checkTypes(outputData, settings, data);
                }
                catch (err) {
                    if (err instanceof CompilerError)
                        console.error(err.message);
                    else
                        throw err;
                }
            }
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
        for (let filename of filelist_mlog) {
            if (filename != "main.mlog") {
                compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
            else {
                mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
            }
        }
        console.log("Compiled all files successfully.");
        console.log("Assembling output:");
        let outputData = [
            ...mainData, "end", "",
            "#functions",
            ...[].concat(...Object.values(compiledData).map(program => program.concat("end"))), "",
            "#stdlib functions",
            ...[].concat(...Object.entries(stdlibData).filter(([name, program]) => settings.compilerOptions.include.includes(name)).map(([name, program]) => program.concat("end"))),
            "", ...compilerMark
        ];
        if (settings.compilerOptions.checkTypes) {
            try {
                checkTypes(outputData, settings);
            }
            catch (err) {
                if (err instanceof CompilerError)
                    console.error(err.message);
                else
                    throw err;
            }
        }
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData.join("\r\n"));
    }
    console.log("Done!");
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
