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
export class Log {
    static debug(message) {
        console.log(chalk.gray(`[DEBUG]\t${message}`));
    }
    static dump(...objects) {
        console.log(`[DEBUG]`, ...objects);
    }
    static info(message) {
        console.log(chalk.white(`[INFO]\t${message}`));
    }
    static warn(message) {
        console.warn(chalk.yellow(`[WARN]\t${message}`));
    }
    static err(message) {
        console.error(chalk.redBright(`[ERROR]\t${message}`));
    }
    static fatal(message) {
        console.error(`[FATAL]\t${chalk.bgRed.white(message)}`);
    }
    static announce(message, ...rest) {
        console.log(chalk.blueBright(`${message}`), ...rest);
    }
    static none(message) {
        console.log(message);
    }
}
