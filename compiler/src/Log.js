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
    "invalid uncompiled command definition": { for: (d) => `Tried to type check a line(${d[1].text} => ${d[0]}) with invalid uncompiled command definition. This may cause issues with type checking. This is an error with MLOGX.`, level: "err" },
    "variable redefined with conflicting type": { for: (d) => `Variable "${d.name}" was defined with ${d.types.length} different types. ([${d.types.join(", ")}])
	First definition:
${formatLineWithPrefix(d.definitions[0].line, d.settings, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(d.definitions.filter(v => v.variableType == d.types[1])[0].line, d.settings, "\t\t")}`,
        level: "warn" },
    "variable undefined": { for: (d) => `Variable "${d.name}" seems to be undefined.
${formatLineWithPrefix(d.line, d.settings)}`,
        level: "warn" },
    "jump label redefined": { for: (d) => `Jump label "${d.jumpLabel}" was defined ${d.numDefinitions} times.`, level: "warn" },
    "jump label missing": { for: (d) => `Jump label "${d.jumpLabel}" is missing.`, level: "warn" },
    "line contains U+F4321": { for: (d) => `Line includes the character U+F4321 which may cause issues with argument parsing
${formatLineWithPrefix(d.line, d.settings)}`,
        level: "warn" },
    "cannot port invalid line": { for: (d) => `Line cannot be ported as it is not valid for any known command definition
${formatLineWithPrefix(d.line, { filename: "unknown" })}`,
        level: "warn" },
    "unknown compiler const": { for: (d) => `Unknown compiler const "${d.name}"`, level: "warn" },
});
export class Logger {
    constructor(logLevels, messages) {
        this.logLevels = logLevels;
        this.messages = messages;
        this.level = "info";
    }
    printWithLevel(level, message) {
        this.level = level;
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
