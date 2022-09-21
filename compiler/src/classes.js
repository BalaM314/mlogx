import chalk from "chalk";
export class Arg {
    constructor(type, name = "WIP", isOptional = false, isGeneric = true, isVariable = false, spread = false) {
        this.type = type;
        this.name = name;
        this.isOptional = isOptional;
        this.isGeneric = isGeneric;
        this.isVariable = isVariable;
        this.spread = spread;
    }
    toString() {
        if (!this.isGeneric)
            return `${this.type}`;
        if (this.isOptional)
            return `(${this.spread ? "..." : ""}${this.name}:${this.isVariable ? "*" : ""}${this.type})`;
        else
            return `[${this.spread ? "..." : ""}${this.name}:${this.isVariable ? "*" : ""}${this.type}]`;
    }
}
export class CompilerError extends Error {
    constructor(message) {
        super(message);
        this.name = "CompilerError";
    }
}
const logLevels = ((e) => (e))({
    "debug": [chalk.gray, "[DEBUG]"],
    "info": [chalk.white, "[INFO]"],
    "warn": [chalk.yellow, "[WARN]"],
    "err": [chalk.red, "[ERROR]"],
    "fatal": [chalk.bgRed.white, "[FATAL]"],
    "announce": [chalk.blueBright, ""],
    "none": [m => m, ""],
});
const messages = ((messagesData) => messagesData)({
    "unknownRequire": { for: (d) => `Unknown require ${d.requiredVar}`, level: "warn" }
});
export class Log {
    static printWithLevel(level, message) {
        this.level = level;
        console.log(logLevels[level][0](`${logLevels[level][1]}${logLevels[level][1].length == 0 ? "" : "\t"}${message}`));
    }
    static debug(message) { this.printWithLevel("debug", message); }
    static dump(...objects) {
        if (objects[0] in logLevels) {
            this.level = objects[0];
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
