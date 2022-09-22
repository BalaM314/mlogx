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
export class Log {
    static printWithLevel(level, message) {
        this.level = level;
        console.log(logLevels[level][0](`${logLevels[level][1]}${logLevels[level][1].length == 0 ? "" : "\t"}${message}`));
    }
    static debug(message) { this.printWithLevel("debug", message); }
    static dump(...objects) {
        const firstArg = objects[0];
        if (isKey(logLevels, firstArg)) {
            this.level = firstArg;
            console.log(logLevels[this.level] + "\t", ...(objects.slice(1)));
        }
        else {
            console.log(logLevels[this.level] + "\t", ...objects);
        }
    }
    static info(message) { this.printWithLevel("info", message); }
    static warn(message) { this.printWithLevel("warn", message); }
    static err(message) { this.printWithLevel("err", message); }
    static fatal(message) { this.printWithLevel("fatal", message); }
    static announce(message) { this.printWithLevel("announce", message); }
    static none(message) { this.printWithLevel("none", message); }
    static printMessage(messageID, data) {
        const message = messages[messageID];
        Log[message.level](message.for(data));
    }
}
