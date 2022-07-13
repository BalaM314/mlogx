import chalk from "chalk";
export class Arg {
    constructor(type, name = "WIP", isOptional = false, isGeneric = true, isVariable = false) {
        this.type = type;
        this.name = name;
        this.isOptional = isOptional;
        this.isGeneric = isGeneric;
        this.isVariable = isVariable;
    }
    toString() {
        if (!this.isGeneric)
            return `${this.type}`;
        if (this.isOptional)
            return `(${this.name}:${this.isVariable ? "*" : ""}${this.type})`;
        else
            return `[${this.name}:${this.isVariable ? "*" : ""}${this.type}]`;
    }
}
export class CompilerError extends Error {
    constructor(message) {
        super(...arguments);
        this.name = "CompilerError";
    }
}
export class Log {
    static debug(message) {
        console.log(chalk.gray(`[DEBUG] ${message}`));
    }
    static dump(...objects) {
        console.log(`[DEBUG]`, objects);
    }
    static info(message) {
        console.log(chalk.white(`[INFO] ${message}`));
    }
    static warn(message) {
        console.warn(chalk.yellow(`[WARN] ${message}`));
    }
    static err(message) {
        console.error(chalk.redBright(`[ERROR] ${message}`));
    }
    static fatal(message) {
        console.error(`[FATAL] ${chalk.bgRed.white(message)}`);
    }
    static announce(message) {
        console.log(chalk.green(`${message}`));
    }
    static none(message) {
        console.log(message);
    }
}
