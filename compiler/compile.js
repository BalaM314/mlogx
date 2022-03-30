const fs = require("fs");
const programArgs = parseArgs(process.argv.slice(2));
if (process.cwd().match(/compiler$/gi)) {
    process.chdir("..");
}
var GenericArgType;
(function (GenericArgType) {
    GenericArgType["variable"] = "variable";
    GenericArgType["number"] = "number";
    GenericArgType["string"] = "string";
    GenericArgType["type"] = "type";
    GenericArgType["building"] = "building";
    GenericArgType["unit"] = "unit";
    GenericArgType["function"] = "function";
    GenericArgType["any"] = "any";
    GenericArgType["null"] = "null";
    GenericArgType["operandTest"] = "operandTest";
    GenericArgType["targetClass"] = "targetClass";
    GenericArgType["unitSortCriteria"] = "unitSortCriteria";
    GenericArgType["valid"] = "valid";
    GenericArgType["operandType"] = "operandType";
    GenericArgType["lookupType"] = "lookupType";
    GenericArgType["jumpAddress"] = "jumpAddress";
})(GenericArgType || (GenericArgType = {}));
var CommandErrorType;
(function (CommandErrorType) {
    CommandErrorType[CommandErrorType["argumentCount"] = 0] = "argumentCount";
    CommandErrorType[CommandErrorType["type"] = 1] = "type";
})(CommandErrorType || (CommandErrorType = {}));
class Arg {
    constructor(type, name = "WIP", optional = false) {
        this.type = type;
        this.name = name;
        this.optional = optional;
    }
    toString() {
        if (!GenericArgType[this.type])
            return `${this.type}`;
        if (this.optional)
            return `(${this.name}:${this.type})`;
        else
            return `[${this.name}:${this.type}]`;
    }
}
let commands = {
    call: [{
            args: [new Arg(GenericArgType.function, "function")],
            replace: [
                "set _stack1 @counter",
                "op add _stack1 _stack1 2",
                "jump %1 always"
            ],
            description: "Calls a function."
        }],
    increment: [{
            args: [new Arg(GenericArgType.variable, "variable"), new Arg(GenericArgType.number, "amount")],
            replace: ["op add %1 %1 %2"],
            description: "Adds a number to a variable."
        }],
    return: [{
            args: [],
            replace: ["set @counter _stack1"],
            description: "Returns to the main program from a function."
        }],
    throw: [{
            args: [new Arg(GenericArgType.string, "error")],
            replace: [
                "set _err %1",
                "jump _err always"
            ],
            description: "Throws an error."
        }],
    uflag: [{
            args: [new Arg(GenericArgType.type, "type")],
            replace: [
                "set _unit_type %1",
                "set _stack1 @counter",
                "op add _stack1 _stack1 2",
                "jump _flag_unit always",
            ],
            description: "Binds and flags a unit of specified type."
        }],
    read: [{
            args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.building, "cell"), new Arg(GenericArgType.number, "index")],
            description: "Reads a value from a memory cell."
        }],
    write: [{
            args: [new Arg(GenericArgType.variable, "value"), new Arg(GenericArgType.building, "cell"), new Arg(GenericArgType.number, "index")],
            description: "Writes a value to a memory cell."
        }],
    draw: [
        {
            args: [new Arg("clear"), new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b")],
            description: "Clears the display."
        },
        {
            args: [new Arg("color"), new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b"), new Arg(GenericArgType.number, "a")],
            description: "Sets the draw color."
        },
        {
            args: [new Arg("stroke"), new Arg(GenericArgType.number, "width")],
            description: "Sets the stroke width."
        },
        {
            args: [new Arg("line"), new Arg(GenericArgType.number, "x1"), new Arg(GenericArgType.number, "y1"), new Arg(GenericArgType.number, "x2"), new Arg(GenericArgType.number, "y2")],
            description: "Draws a line between two points."
        },
        {
            args: [new Arg("rect"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "width"), new Arg(GenericArgType.number, "height")],
            description: "Draws a rectangle."
        },
        {
            args: [new Arg("linerect"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "width"), new Arg(GenericArgType.number, "height")],
            description: "Draws the outline of a rectangle."
        },
        {
            args: [new Arg("poly"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "sides"), new Arg(GenericArgType.number, "radius"), new Arg(GenericArgType.number, "rotation")],
            description: "Draws a (regular) polygon."
        },
        {
            args: [new Arg("linepoly"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "sides"), new Arg(GenericArgType.number, "radius"), new Arg(GenericArgType.number, "rotation")],
            description: "Draws the outline of a polygon."
        },
        {
            args: [new Arg("triangle"), new Arg(GenericArgType.number, "x1"), new Arg(GenericArgType.number, "y1"), new Arg(GenericArgType.number, "x2"), new Arg(GenericArgType.number, "y2"), new Arg(GenericArgType.number, "x3"), new Arg(GenericArgType.number, "y3")],
            description: "Draws a triangle."
        },
        {
            args: [new Arg("image"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.type, "image"), new Arg(GenericArgType.number, "size"), new Arg(GenericArgType.number, "rotation")],
            description: "Displays an image."
        },
    ],
    print: [{
            args: [new Arg(GenericArgType.string, "message")],
            description: "Prints a value to the message buffer."
        }],
    drawflush: [{
            args: [new Arg(GenericArgType.building, "display")],
            description: "Flushes queued draw instructions to a display."
        }],
    printflush: [{
            args: [new Arg(GenericArgType.building, "messageblock")],
            description: "Flushes queued print instructions to a message block."
        }],
    getlink: [{
            args: [new Arg(GenericArgType.variable, "output"), new Arg(GenericArgType.number, "number")],
            description: "Gets the nth linked building. Useful when looping over all buildings."
        }],
    control: [
        {
            args: [new Arg("enabled"), new Arg(GenericArgType.building, "building"), new Arg(GenericArgType.number, "enabled")],
            description: "Sets whether a building is enabled."
        },
        {
            args: [new Arg("shoot"), new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.number, "x"), new Arg(GenericArgType.number, "y"), new Arg(GenericArgType.number, "shoot")],
            description: "Sets the shoot position of a turret."
        },
        {
            args: [new Arg("shootp"), new Arg(GenericArgType.building, "turret"), new Arg(GenericArgType.unit, "unit"), new Arg(GenericArgType.number, "shoot")],
            description: "Sets the shoot position of a turret to a unit with velocity prediction."
        },
        {
            args: [new Arg("config"), new Arg(GenericArgType.building, "building"), new Arg(GenericArgType.valid, "config")],
            description: "Sets the config of a building."
        },
        {
            args: [new Arg("color"), new Arg(GenericArgType.building, "illuminator"), new Arg(GenericArgType.number, "r"), new Arg(GenericArgType.number, "g"), new Arg(GenericArgType.number, "b")],
            description: "Sets the color of an illuminator."
        },
    ],
    radar: [{
            args: [new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.unitSortCriteria), new Arg(GenericArgType.building), new Arg(GenericArgType.number), new Arg(GenericArgType.variable)],
            description: "Finds nearby units of specified type."
        }],
    sensor: [
        {
            args: [new Arg(GenericArgType.variable), new Arg(GenericArgType.building), new Arg(GenericArgType.type)],
            description: "Gets information about a building, does not need to be linked or on the same team."
        },
        {
            args: [new Arg(GenericArgType.variable), new Arg(GenericArgType.unit), new Arg(GenericArgType.type)],
            description: "Gets information about a unit, does not need to be on the same team."
        },
    ],
    set: [{
            args: [new Arg(GenericArgType.variable), new Arg(GenericArgType.valid)],
            description: "Sets a variable."
        }],
    op: [{
            args: [new Arg(GenericArgType.operandType), new Arg(GenericArgType.variable), new Arg(GenericArgType.number), new Arg(GenericArgType.number)],
            description: "Performs an operation."
        }],
    wait: [{
            args: [new Arg(GenericArgType.number)],
            description: "Waits the specified number of seconds."
        }],
    lookup: [{
            args: [new Arg(GenericArgType.lookupType), new Arg(GenericArgType.variable), new Arg(GenericArgType.number)],
            description: "Looks up an item, building, fluid, or unit type."
        }],
    end: [{
            args: [],
            description: "Terminates execution."
        }],
    jump: [{
            args: [new Arg(GenericArgType.jumpAddress), new Arg(GenericArgType.operandTest), new Arg(GenericArgType.valid, "var1", true), new Arg(GenericArgType.valid, "var2", true)],
            description: "Jumps to an address or label if a condition is met."
        }],
    ubind: [{
            args: [new Arg(GenericArgType.type)],
            description: "Binds a unit of specified type. May return dead units."
        }],
    ucontrol: [{
            args: [new Arg(GenericArgType.any), new Arg(GenericArgType.number), new Arg(GenericArgType.number), new Arg(GenericArgType.any), new Arg(GenericArgType.number), new Arg(GenericArgType.any)],
            description: "Controls the bound unit."
        }],
    uradar: [{
            args: [new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.targetClass), new Arg(GenericArgType.unitSortCriteria), new Arg(GenericArgType.number), new Arg(GenericArgType.number), new Arg(GenericArgType.variable)],
            description: "Finds other units of specified class near the bound unit."
        }],
    ulocate: [{
            args: [new Arg(GenericArgType.any), new Arg(GenericArgType.any), new Arg(GenericArgType.number), new Arg(GenericArgType.type), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable), new Arg(GenericArgType.variable)],
            description: "Finds buildings of specified type near the bound unit."
        }],
};
let settings = {
    errorlevel: "warn"
};
function typeofArg(arg) {
    if (arg == "")
        return GenericArgType.null;
    if (arg == undefined)
        return GenericArgType.null;
    arg = arg.toLowerCase();
    if (arg.match(/@[a-z\-]+/i)) {
        if (arg == "@counter")
            return GenericArgType.variable;
        if (arg == "@unit")
            return GenericArgType.unit;
        if (arg == "@thisx")
            return GenericArgType.number;
        if (arg == "@thisy")
            return GenericArgType.number;
        if (arg == "@this")
            return GenericArgType.building;
        if (arg == "@ipt")
            return GenericArgType.number;
        if (arg == "@links")
            return GenericArgType.number;
        if (arg == "@time")
            return GenericArgType.number;
        if (arg == "@ipt")
            return GenericArgType.number;
        if (arg == "@tick")
            return GenericArgType.number;
        if (arg == "@mapw")
            return GenericArgType.number;
        if (arg == "@maph")
            return GenericArgType.number;
        return GenericArgType.type;
    }
    if (["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg))
        return GenericArgType.operandTest;
    if (["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg))
        return GenericArgType.targetClass;
    if (arg == "true" || arg == "false")
        return GenericArgType.number;
    if (arg.match(/^-?[\d]+$/))
        return GenericArgType.number;
    if (arg.match(/^"[^"]*"$/gi))
        return GenericArgType.string;
    if (arg.match(/^[a-z]+[\d]+$/gi))
        return GenericArgType.building;
    if (arg.match(/^[^"]+$/i))
        return GenericArgType.variable;
    return GenericArgType.null;
}
function isArgOfType(arg, type) {
    if (type === GenericArgType.any)
        return true;
    if (arg == "0")
        return true;
    if (arg == "")
        return false;
    if (arg == undefined)
        return false;
    arg = arg.toLowerCase();
    if (GenericArgType[type] == undefined) {
        return arg === type;
    }
    let knownType = typeofArg(arg);
    if (knownType == type)
        return true;
    switch (type) {
        case GenericArgType.type:
        case GenericArgType.number:
        case GenericArgType.string:
        case GenericArgType.building:
        case GenericArgType.unit:
        case GenericArgType.function:
            return knownType == GenericArgType.variable;
        case GenericArgType.operandTest:
            return ["equal", "notequal", "strictequal", "greaterthan", "lessthan", "greaterthaneq", "lessthaneq", "always"].includes(arg);
        case GenericArgType.operandType:
            return true;
        case GenericArgType.lookupType:
            return ["building", "unit", "fluid", "item"].includes(arg);
        case GenericArgType.targetClass:
            return ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg);
        case GenericArgType.operandTest:
            return true;
        case GenericArgType.unitSortCriteria:
            return ["distance", "health", "shield", "armor", "maxHealth"].includes(arg);
        case GenericArgType.valid:
            return true;
        case GenericArgType.jumpAddress:
            return knownType == GenericArgType.number || knownType == GenericArgType.variable;
    }
    return false;
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
            console.warn("Error: " + message);
        }
        else {
            throw new CompilerError(message);
        }
    }
    let outputData = [];
    nextLine: for (var line of program) {
        if (line.includes("#") || line.includes("//")) {
            if (!false) {
                line = line.split("#")[0];
                line = line.split("//")[0];
            }
        }
        line = line.replace("\t", "");
        if (line == "")
            continue;
        line = line.split(" ").map(arg => arg.startsWith("__") ? `__${data.filename}${arg}` : arg).join(" ");
        if (line.match(/[^ ]+:$/)) {
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
        let commandList = commands[args[0].toLowerCase()];
        if (!commandList) {
            err(`Unknown command ${args[0]}\nat \`${line}\``);
            continue;
        }
        let error;
        for (let command of commandList) {
            let result = checkCommand(args, command, line);
            if (result instanceof Array) {
                outputData.push(...result);
                continue nextLine;
            }
            else {
                error = result;
            }
        }
        if (commandList.length == 1) {
            err(error.message);
        }
        else {
            err(`Line
	\`${line}\`
	did not match any overloads for command ${args[0]}`);
        }
        if (!commandList[0].replace) {
            outputData.push(line + "#Error");
        }
    }
    return outputData;
}
function checkCommand(args, command, line) {
    let arguments = args.slice(1);
    if (arguments.length > command.args.length || arguments.length < command.args.filter(arg => !arg.optional).length) {
        return {
            type: CommandErrorType.argumentCount,
            message: `Incorrect number of arguments for command ${args[0]}
	at \`${line}\`
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
        };
    }
    for (let arg in arguments) {
        if (!isArgOfType(arguments[+arg], command.args[+arg].type)) {
            return {
                type: CommandErrorType.type,
                message: `Type mismatch: value ${arguments[+arg]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(arguments[+arg])}
	at \`${line}\``
            };
        }
    }
    if (command.replace) {
        let out = [];
        for (var replaceLine of command.replace) {
            replaceLine = replaceLine.replace(/%1/g, args[1]);
            replaceLine = replaceLine.replace(/%2/g, args[2]);
            replaceLine = replaceLine.replace(/%3/g, args[3]);
            out.push(replaceLine);
        }
        return out;
    }
    return [line];
}
function parseArgs(args) {
    let parsedArgs = {};
    let argName = "null";
    for (let arg of args) {
        if (arg.startsWith("--")) {
            argName = arg.slice(2);
            parsedArgs[arg.toLowerCase().slice(2)] = "null";
        }
        else if (argName) {
            parsedArgs[argName] = arg.toLowerCase();
            argName = "null";
        }
    }
    return parsedArgs;
}
function main() {
    if (programArgs["directory"]) {
        console.log("Compiling in directory " + programArgs["directory"]);
        process.chdir(programArgs["directory"]);
    }
    if (programArgs["help"]) {
        console.log(`Usage: compile [--help] [--directory <directory>] [--info <command>]
\t--help\tDisplays this help message and exits.
\t--info\tShows information about a command.
\t--directory\tCompiles in a different directory.`);
    }
    if (programArgs["info"]) {
        if (programArgs["info"] == "null")
            return console.log("Please specify a command to get information on.");
        if (!commands[programArgs["info"]])
            console.log(`Unknown command ${programArgs["info"]}`);
        else
            console.log(`${programArgs["info"]}
Usage:

${commands[programArgs["info"]].map(command => programArgs["info"] + " " + command.args.map(arg => arg.toString()).join(" ") + "\n" + command.description).join("\n\n")}
`);
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
