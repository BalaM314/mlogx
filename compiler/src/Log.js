import chalk from "chalk";
import { extend, formatLineWithPrefix, isKey } from "./funcs.js";
export const logLevels = extend()({
    "debug": [chalk.gray, "[DEBUG]"],
    "info": [chalk.white, "[INFO]"],
    "warn": [chalk.yellow, "[WARN]"],
    "err": [chalk.red, "[ERROR]"],
    "fatal": [chalk.bgRed.white, "[FATAL]"],
    "announce": [chalk.blueBright, ""],
    "none": [m => m, ""],
});
export const messages = extend()({
    "unknown require": { for: (d) => `Unknown require ${d.requiredVar}`, level: "warn" },
    "wrong file ran": { for: (d) => `Running index.js is deprecated, please run cli.js instead.`, level: "warn" },
    "statement port failed": { for: (d) => `Cannot port ${d.name} statement "${d.statement}" because ${d.reason ?? "it is invalid"}`, level: "err" },
    "if statement condition not boolean": { for: (d) => `Condition in &if statement was "${d.condition}", expected true or false.`, level: "warn" },
    "compiler mode project but no src directory": { for: (d) => `Compiler mode set to "project" but no src directory found.`, level: "warn" },
    "files to compile": { for: (filelist) => `Files to compile: [${filelist.map(file => chalk.green(file)).join(", ")}]`, level: "announce" },
    "compiling file": { for: (d) => `Compiling file ${d.filename}`, level: "announce" },
    "compiling file failed": { for: (d) => `Failed to compile file ${d.filename}!`, level: "err" },
    "assembling output": { for: (d) => `Compiled all files successfully.\nAssembling output:`, level: "announce" },
    "compilation complete": { for: (d) => `Compilation complete.`, level: "announce" },
    "settings.compilerVariables deprecated": { for: (d) => `settings.compilerVariables is deprecated, please use settings.compilerConstants instead.`, level: "warn" },
    "invalid config.json": { for: (err) => `config.json file is invalid. (${err.message}) Using default settings.`, level: "err" },
    "no config.json": { for: (d) => `No config.json found, using default settings.`, level: "debug" },
    "project created": { for: (d) => `Successfully created a new project in ${d.dirname}`, level: "announce" },
    "program too long": { for: (d) => `Program length exceeded 999 lines. Running it in-game will silently fail.`, level: "err" },
    "invalid uncompiled command definition": { for: (d) => `Tried to type check a line(${d.line[1].text} => ${d.line[0]}) with invalid uncompiled command definition. This may cause issues with type checking. This is an error with MLOGX.`, level: "err" },
    "variable redefined with conflicting type": { for: (d) => `Variable "${d.name}" was defined with ${d.types.length} different types. ([${d.types.join(", ")}])
	First definition:
${formatLineWithPrefix(d.firstDefinitionLine, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(d.conflictingDefinitionLine, "\t\t")}`,
        level: "warn" },
    "variable undefined": { for: (d) => `Variable "${d.name}" seems to be undefined.
${formatLineWithPrefix(d.line)}`,
        level: "warn" },
    "jump label redefined": { for: (d) => `Jump label "${d.jumpLabel}" was defined ${d.numDefinitions} times.`, level: "warn" },
    "jump label missing": { for: (d) => `Jump label "${d.jumpLabel}" is missing.`, level: "warn" },
    "cannot port invalid line": { for: (d) => `Line cannot be ported as it is not valid for any known command definition
${formatLineWithPrefix(d.line)}`,
        level: "warn" },
    "unknown compiler const": { for: (d) => `Unknown compiler const "${d.name}"`, level: "warn" },
    "line invalid": { for: (d) => `Line "${d.line}" is invalid.`, level: "err" },
    "commands cannot contain spaces": { for: (d) => `Commands cannot contain spaces.`, level: "err" },
    "unknown command or gat": { for: (d) => `Unknown command or generic arg type "${d.name}"`, level: "err" },
    "command moved": { for: (d) => `"${d.appname} --${d.command}" was moved to "${d.appname} ${d.command}"`, level: "err" },
    "verbose mode on": { for: (d) => `Verbose mode enabled`, level: "debug" },
    "file changes detected": { for: (d) => `\nFile changes detected: ${d.filename}`, level: "announce" },
    "compiling folder": { for: (d) => `Compiling folder ${d.name}`, level: "announce" },
    "invalid path": { for: (d) => `Invalid path specified. Path ${d.name} ${d.reason ?? "does not exist."}.`, level: "err" },
    "adding jump labels": { for: (d) => `Adding jump labels to file ${d.filename}`, level: "announce" },
    "writing to": { for: (d) => `Writing to ${d.outPath}`, level: "announce" },
    "cannot port mlogx": { for: (d) => `File ${d.path} is already mlogx. If you would like to port it again, please rename it to .mlog.`, level: "err" },
    "port successful": { for: (d) => `Ported file ${d.filename} to mlogx.`, level: "announce" },
    "bad arg string": { for: (d) => `Possibly bad arg string "${d.name}", assuming it means a non-generic arg`, level: "warn" },
});
export class Logger {
    constructor(logLevels, messages) {
        this.logLevels = logLevels;
        this.messages = messages;
        this.level = "info";
        this.throwWarnAndErr = false;
    }
    printWithLevel(level, message) {
        this.level = level;
        if (this.throwWarnAndErr && (level == "warn" || level == "err" || level == "fatal"))
            throw new Error(`${level} ${message}`);
        console.log(this.logLevels[level][0](`${logLevels[level][1]}${logLevels[level][1].length == 0 ? "" : "\t"}${message}`));
    }
    debug(message) { this.printWithLevel("debug", message); }
    dump(...objects) {
        const firstArg = objects[0];
        if (isKey(this.logLevels, firstArg)) {
            this.level = firstArg;
            console.log(this.logLevels[this.level][1] + "\t", ...(objects.slice(1)));
        }
        else {
            console.log(this.logLevels[this.level][1] + "\t", ...objects);
        }
    }
    info(message) { this.printWithLevel("info", message); }
    warn(message) { this.printWithLevel("warn", message); }
    err(message) { this.printWithLevel("err", message); }
    fatal(message) { this.printWithLevel("fatal", message); }
    announce(message) { this.printWithLevel("announce", message); }
    none(message) { this.printWithLevel("none", message); }
    printMessage(messageID, data) {
        const message = this.messages[messageID];
        this[message.level](message.for(data));
    }
}
export const Log = new Logger(logLevels, messages);
