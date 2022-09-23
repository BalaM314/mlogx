import chalk from "chalk";
import { extend, isKey } from "./funcs.js";
export class CompilerError extends Error {
    constructor(message) {
        super(message);
        this.name = "CompilerError";
    }
}
const logLevels = extend()({
    "debug": [chalk.gray, "[DEBUG]"],
    "info": [chalk.white, "[INFO]"],
    "warn": [chalk.yellow, "[WARN]"],
    "err": [chalk.red, "[ERROR]"],
    "fatal": [chalk.bgRed.white, "[FATAL]"],
    "announce": [chalk.blueBright, ""],
    "none": [m => m, ""],
});
const messages = extend()({
    "unknown require": { for: (d) => `Unknown require ${d.requiredVar}`, level: "warn" },
    "wrong file ran": { for: (d) => `Running index.js is deprecated, please run cli.js instead.`, level: "warn" },
    "statement port failed": { for: (d) => `Cannot port ${d.name} statement "${d.statement}" because ${d.reason ?? "it is invalid"}`, level: "err" },
    "if statement condition not boolean": { for: (d) => `Condition in &if statement was "${d.condition}", expected true or false.`, level: "warn" },
    "compiler mode project but no src directory": { for: (d) => `Compiler mode set to "project" but no src directory found.`, level: "warn" },
    "files to compile": { for: (filelist) => `Files to compile: [${filelist.map(file => chalk.green(file)).join(", ")}]`, level: "announce" },
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
