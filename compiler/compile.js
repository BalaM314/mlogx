const fs = require("fs");
const programArgs = process.argv.slice(2);
if (process.cwd().match(/compiler$/gi)) {
    process.chdir("..");
}
var ArgType;
(function (ArgType) {
    ArgType["variable"] = "variable";
    ArgType["number"] = "number";
    ArgType["string"] = "string";
    ArgType["type"] = "type";
    ArgType["building"] = "building";
    ArgType["unit"] = "unit";
    ArgType["function"] = "function";
    ArgType["any"] = "any";
    ArgType["null"] = "null";
    ArgType["operand_test"] = "operand_test";
    ArgType["targetClass"] = "targetClass";
})(ArgType || (ArgType = {}));
class Arg {
    constructor(type, optional = false) {
        this.type = type;
        this.optional = optional;
    }
    toString() {
        if (this.optional) {
            return `(${this.type})`;
        }
        else {
            return `[${this.type}]`;
        }
    }
}
let commands = {
    call: {
        args: [new Arg(ArgType.function)],
        replace: [
            "set _stack1 @counter",
            "op add _stack1 _stack1 2",
            "jump %1 always"
        ],
        description: "Calls a function."
    },
    increment: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.number)],
        replace: ["op add %1 %1 %2"],
        description: "Adds a number to a variable."
    },
    return: {
        args: [],
        replace: ["set @counter _stack1"],
        description: "Returns to the main program from a function."
    },
    throw: {
        args: [new Arg(ArgType.string)],
        replace: [
            "set _err %1",
            "jump _err always"
        ],
        description: "Throws an error."
    },
    uflag: {
        args: [new Arg(ArgType.type)],
        replace: [
            "set _unit_type %1",
            "set _stack1 @counter",
            "op add _stack1 _stack1 2",
            "jump _flag_unit always",
        ],
        description: "Binds and flags a unit of specified type."
    },
    read: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)],
        description: "Reads a value from a memory cell."
    },
    write: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)],
        description: "Writes a value to a memory cell."
    },
    draw: {
        args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number)],
        description: "Adds draw instructions to the draw buffer."
    },
    print: {
        args: [new Arg(ArgType.string)],
        description: "Prints a value to the message buffer."
    },
    drawflush: {
        args: [new Arg(ArgType.building)],
        description: "Flushes queued draw instructions to a display."
    },
    printflush: {
        args: [new Arg(ArgType.building)],
        description: "Flushes queued print instructions to a message block."
    },
    getlink: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.number)],
        description: "Gets the nth linked building. Useful when looping over all buildings."
    },
    control: {
        args: [new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any)],
        description: "Controls a building. Can only be used on linked buildings."
    },
    radar: {
        args: [new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.number), new Arg(ArgType.variable)],
        description: "Finds nearby units of specified type."
    },
    sensor: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.any), new Arg(ArgType.type)],
        description: "Gets information about a unit or building, does not need to be linked or on the same team."
    },
    set: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.any)],
        description: "Sets a variable."
    },
    op: {
        args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number), new Arg(ArgType.number)],
        description: "Performs an operation."
    },
    wait: {
        args: [new Arg(ArgType.number)],
        description: "Waits the specified number of seconds."
    },
    lookup: {
        args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number)],
        description: "Looks up an item, building, fluid, or unit type."
    },
    end: {
        args: [],
        description: "Terminates execution."
    },
    jump: {
        args: [new Arg(ArgType.number), new Arg(ArgType.operand_test), new Arg(ArgType.any, true), new Arg(ArgType.any, true)],
        description: "Jumps to an address or label if a condition is met."
    },
    ubind: {
        args: [new Arg(ArgType.type)],
        description: "Binds a unit of specified type. May return dead units."
    },
    ucontrol: {
        args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.number), new Arg(ArgType.any)],
        description: "Controls the bound unit."
    },
    uradar: {
        args: [new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.targetClass), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.variable)],
        description: "Finds other units of specified class near the bound unit."
    },
    ulocate: {
        args: [new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable)],
        description: "Finds buildings of specified type near the bound unit."
    },
};
let settings = {
    errorlevel: "warn"
};
function typeofArg(arg) {
    if (arg == "")
        return ArgType.null;
    arg = arg.toLowerCase();
    if (arg.match(/@[a-z\-]+/i)) {
        if (arg == "@counter")
            return ArgType.variable;
        if (arg == "@unit")
            return ArgType.unit;
        if (arg == "@thisx")
            return ArgType.number;
        if (arg == "@thisy")
            return ArgType.number;
        if (arg == "@this")
            return ArgType.building;
        if (arg == "@ipt")
            return ArgType.number;
        if (arg == "@links")
            return ArgType.number;
        if (arg == "@time")
            return ArgType.number;
        if (arg == "@ipt")
            return ArgType.number;
        if (arg == "@tick")
            return ArgType.number;
        if (arg == "@mapw")
            return ArgType.number;
        if (arg == "@maph")
            return ArgType.number;
        return ArgType.type;
    }
    if (["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg))
        return ArgType.operand_test;
    if (["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg))
        return ArgType.targetClass;
    if (arg == "true")
        return ArgType.number;
    if (arg.match(/^-?[\d]+$/))
        return ArgType.number;
    if (arg.match(/^"[^"]*"$/gi))
        return ArgType.string;
    if (arg.match(/^[a-z]+[\d]+$/gi))
        return ArgType.building;
    if (arg.match(/^[^"]+$/i))
        return ArgType.variable;
    return ArgType.null;
}
function isArgOfType(arg, type) {
    if (type == ArgType.any)
        return true;
    if (arg == "0")
        return true;
    if (arg == "")
        return false;
    arg = arg.toLowerCase();
    let knownType = typeofArg(arg);
    switch (type) {
        case ArgType.variable: return knownType == type;
        case ArgType.type:
        case ArgType.number:
        case ArgType.string:
        case ArgType.building:
        case ArgType.unit:
        case ArgType.function:
            return knownType == type || knownType == ArgType.variable;
        case ArgType.operand_test:
        case ArgType.targetClass:
            return knownType == type;
    }
}
class CompilerError extends Error {
    constructor(message) {
        super(...arguments);
        this.name = "CompilerError";
    }
}
function compileMlogxToMlog(program, data) {
    function err(message) {
        if (settings.errorlevel == "warn") {
            console.warn("Warning: " + message);
        }
        else {
            throw new CompilerError(message);
        }
    }
    let outputData = [];
    for (var line of program) {
        if (line.includes("#") || line.includes("//")) {
            if (!false) {
                line = line.split("#")[0];
                line = line.split("//")[0];
            }
        }
        if (line == "")
            continue;
        line = line.split(/ /).map(arg => arg.startsWith("__") ? `__${data.filename}${arg}` : arg).join(" ");
        if (line.match(/:$/)) {
            outputData.push(line);
            continue;
        }
        let args = line.split(" ");
        if (line.includes(`"`)) {
            let replacementLine = [];
            let isInString = false;
            for (var char of line) {
                if (char == `"`) {
                    isInString = !isInString;
                }
                if (isInString && char == " ") {
                    replacementLine.push("\uFFFD");
                }
                else {
                    replacementLine.push(char);
                }
            }
            args = replacementLine.join("").split(" ").map(arg => arg.replaceAll("\uFFFD", " "));
        }
        let command = commands[args[0].toLowerCase()];
        if (!command) {
            err(`Unknown command ${args[0]}\nat ${line}`);
            continue;
        }
        if (args.length - 1 > command.args.length || args.length - 1 < command.args.filter(arg => !arg.optional).length) {
            err(`Incorrect number of arguments for command ${args[0]}
at ${line}
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`);
            if (command.replace)
                continue;
        }
        for (let arg in command.args) {
            if (!isArgOfType(args[+arg + 1], command.args[+arg].type)) {
                err(`Type mismatch: value ${args[+arg + 1]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(args[+arg + 1])}
\tat \`${line}\``);
            }
        }
        if (command.replace) {
            for (var replaceLine of command.replace) {
                replaceLine = replaceLine.replace(/%1/g, args[1]);
                replaceLine = replaceLine.replace(/%2/g, args[2]);
                replaceLine = replaceLine.replace(/%3/g, args[3]);
                outputData.push(replaceLine);
            }
            continue;
        }
        outputData.push(line);
    }
    return outputData;
}
function main() {
    if (programArgs[0] == "--directory" && programArgs[1]) {
        console.log("Compiling in directory " + programArgs[1]);
        process.chdir(programArgs[1]);
    }
    if (programArgs[0] == "--help") {
        if (!commands[programArgs[1]])
            console.log(`Unknown command ${programArgs[1]}`);
        else
            console.log(`${programArgs[1]}: ${commands[programArgs[1]]}\nUsage: ${programArgs[1]} ${commands[programArgs[1]].args.map(arg => arg.toString()).join(" ")}`);
        return;
    }
    if (!fs.existsSync(process.cwd() + "/src")) {
        console.error("No src directory found!");
        return;
    }
    if (!fs.existsSync(process.cwd() + "/build")) {
        fs.mkdirSync(process.cwd() + "/build");
    }
    let filelist_mlogx = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
    let filelist_mlog = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlog$/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let mainData = "";
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                filename: filename.split(".mlogx")[0] == "main.mlogx" ? "" : filename.split(".mlogx")[0]
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
        fs.writeFileSync(`build/${filename.slice(0, -1)}`, outputData);
        if (data[0] == "#include never")
            continue;
        if (filename != "main.mlogx") {
            compiledData[filename] = outputData;
        }
        else {
            mainData = outputData;
        }
    }
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
    fs.writeFileSync(`out.mlog`, mainData + "\r\nend\r\n\r\n" + Object.values(compiledData).join("\r\n\r\n"));
    console.log("Done!");
}
main();
