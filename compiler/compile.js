"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const [programArgs, fileNames] = parseArgs(process.argv.slice(2));
const stdlibDirectory = path.join(process.argv[1], "..", "..", "stdlib", "build");
const compilerMark = `print "Made with mlogx"
print "github.com/BalaM314/mlogx/"`;
const defaultConfig = {
    name: "",
    authors: [],
    compilerOptions: {
        include: [],
        removeComments: true,
        compileWithErrors: true,
        mode: "single",
        prependFileName: true
    }
};
var GenericArgType;
(function (GenericArgType) {
    GenericArgType["variable"] = "variable";
    GenericArgType["number"] = "number";
    GenericArgType["string"] = "string";
    GenericArgType["boolean"] = "boolean";
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
    GenericArgType["operand"] = "operand";
    GenericArgType["lookupType"] = "lookupType";
    GenericArgType["jumpAddress"] = "jumpAddress";
    GenericArgType["buildingGroup"] = "buildingGroup";
})(GenericArgType || (GenericArgType = {}));
var CommandErrorType;
(function (CommandErrorType) {
    CommandErrorType[CommandErrorType["argumentCount"] = 0] = "argumentCount";
    CommandErrorType[CommandErrorType["type"] = 1] = "type";
})(CommandErrorType || (CommandErrorType = {}));
function isGenericArg(val) {
    return GenericArgType[val] != undefined;
}
class Arg {
    constructor(type, name = "WIP", optional = false, generic = true, variable = false) {
        this.type = type;
        this.name = name;
        this.optional = optional;
        this.generic = generic;
        this.variable = variable;
    }
    toString() {
        if (!this.generic)
            return `${this.type}`;
        if (this.optional)
            return `(${this.name}:${this.variable ? "*" : ""}${this.type})`;
        else
            return `[${this.name}:${this.variable ? "*" : ""}${this.type}]`;
    }
}
function arg(str) {
    let [name, type] = str.split(":");
    let isVariable = false;
    let isOptional = false;
    if (type) {
        if (type.startsWith("*")) {
            isVariable = true;
            type = type.substring(1);
        }
        if (type.endsWith("?")) {
            isVariable = true;
            type = type.substring(type.length - 1);
        }
    }
    return new Arg(type, name, isOptional, !!type, isVariable);
}
function processCommands(preprocessedCommands) {
    let out = {};
    for (let [name, commands] of Object.entries(preprocessedCommands)) {
        out[name] = [];
        for (let command of commands) {
            out[name].push({
                ...command,
                args: command.args.map(arg => typeof arg == "string" ? new Arg(arg, arg, false, false) : arg)
            });
        }
    }
    return out;
}
let commands = processCommands({
    call: [{
            args: [arg("function:function")],
            replace: [
                "set _stack1 @counter",
                "op add _stack1 _stack1 2",
                "jump %1 always"
            ],
            description: "Calls (function)."
        }],
    increment: [{
            args: [arg("variable:variable"), arg("amount:number")],
            replace: ["op add %1 %1 %2"],
            description: "Adds a (amount) to (variable)."
        }],
    return: [{
            args: [],
            replace: ["set @counter _stack1"],
            description: "Returns to the main program from a function."
        }],
    throw: [{
            args: [arg("error:string")],
            replace: [
                "set _err %1",
                "jump _err always"
            ],
            description: "Throws (error)."
        }],
    uflag: [{
            args: [arg("type:type")],
            replace: [
                "set _unit_type %1",
                "set _stack1 @counter",
                "op add _stack1 _stack1 2",
                "jump _flag_unit always",
            ],
            description: "Binds and flags a unit of type (type)."
        }],
    read: [{
            args: [arg("output:*number"), arg("cell:building"), arg("index:number")],
            description: "Reads a value at index (index) from memory cell (cell) and outputs to (output)."
        }],
    write: [{
            args: [arg("value:*number"), arg("cell:building"), arg("index:number")],
            description: "Writes (value) at index (index) from memory cell (cell)."
        }],
    draw: [
        {
            args: ["clear", arg("r:number"), arg("g:number"), arg("b:number")],
            description: "Clears the display, replacing it with color (r,g,b)."
        }, {
            args: ["color", arg("r:number"), arg("g:number"), arg("b:number"), arg("a:number")],
            description: "Sets the draw color to (r,g,b)."
        }, {
            args: ["stroke", arg("width:number")],
            description: "Sets the stroke width to (width)."
        }, {
            args: ["line", arg("x1:number"), arg("y1:number"), arg("x2:number"), arg("y2:number")],
            description: "Draws a line between (x1, y1) and (x2, y2)."
        }, {
            args: ["rect", arg("x:number"), arg("y:number"), arg("width:number"), arg("height:number")],
            description: "Draws a rectangle with lower right corner at (x,y) with width (width) and height (height)."
        }, {
            args: ["linerect", arg("x:number"), arg("y:number"), arg("width:number"), arg("height:number")],
            description: "Draws the outline of a rectangle with lower right corner at (x,y) with width (width) and height (height)."
        }, {
            args: ["poly", arg("x:number"), arg("y:number"), arg("sides:number"), arg("radius:number"), arg("rotation:number")],
            description: "Draws a (regular) polygon centered at (x,y) with (sides) sides and a radius of (radius)."
        }, {
            args: ["linepoly", arg("x:number"), arg("y:number"), arg("sides:number"), arg("radius:number"), arg("rotation:number")],
            description: "Draws the outline of a polygon centered at (x,y) with (sides) sides and a radius of (radius)."
        }, {
            args: ["triangle", arg("x1:number"), arg("y1:number"), arg("x2:number"), arg("y2:number"), arg("x3:number"), arg("y3:number")],
            description: "Draws a triangle between the points (x1, y1), (x2, y2), and (x3, y3)."
        }, {
            args: ["image", arg("x:number"), arg("y:number"), arg("image:type"), arg("size:number"), arg("rotation:number")],
            description: "Displays an image of (image) centered at (x,y) with size (size) and rotated (rotation) degrees."
        },
    ],
    print: [{
            args: [arg("message:string")],
            description: "Prints (message) to the message buffer."
        }],
    drawflush: [{
            args: [arg("display:building")],
            description: "Flushes queued draw instructions to (display)."
        }],
    printflush: [{
            args: [arg("messageblock:building")],
            description: "Flushes queued print instructions to (messageblock)"
        }],
    getlink: [{
            args: [arg("output:*building"), arg("n:number")],
            description: "Gets the (n)th linked building. Useful when looping over all buildings."
        }],
    control: [
        {
            args: ["enabled", arg("building:building"), arg("enabled:boolean")],
            description: "Sets whether (building) is enabled."
        }, {
            args: ["shoot", arg("turret:building"), arg("x:number"), arg("y:number"), arg("shoot:boolean")],
            description: "Sets the shoot position of (turret) to (x,y) and shoots if (shoot)."
        }, {
            args: ["shootp", arg("turret:building"), arg("unit:unit"), arg("shoot:boolean")],
            description: "Sets the shoot position of (turret) to (unit) with velocity prediction and shoots if (shoot)."
        }, {
            args: ["config", arg("building:building"), arg("config:valid")],
            description: "Sets the config of (building) to (config)."
        }, {
            args: ["color", arg("illuminator:building"), arg("r:number"), arg("g:number"), arg("b:number")],
            description: "Sets the color of (illuminator) to (r,g,b)."
        },
    ],
    radar: [
        {
            args: [arg("targetClass1:targetClass"), arg("targetClass2:targetClass"), arg("targetClass3:targetClass"), arg("sortCriteria:unitSortCriteria"), arg("turret:building"), arg("sortOrder:number"), arg("output:*any")],
            description: "Finds units of specified type within the range of (turret)."
        }, {
            args: [arg("targetClass:targetClass"), arg("sortCriteria:unitSortCriteria"), arg("turret:building"), arg("sortOrder:number"), arg("output:*unit")],
            description: "Finds units of specified type within the range of (turret).",
            replace: [
                "radar %1 %1 %1 %2 %3 %4 %5"
            ]
        },
    ],
    sensor: [
        {
            args: [arg("output:*any"), arg("building:building"), arg("value:type")],
            description: "Gets information about (building) and outputs to (output), does not need to be linked or on the same team."
        }, {
            args: [arg("output:*any"), arg("unit:unit"), arg("value:type")],
            description: "Gets information about (unit) and outputs to (output), does not need to be on the same team."
        },
    ],
    set: [{
            args: [arg("variable:*any"), arg("value:valid")],
            description: "Sets the value of (variable) to (value)."
        }],
    op: [
        {
            args: [arg("operand:operand"), arg("output:*any"), arg("arg1:valid"), arg("arg2:valid?")],
            description: "Performs an operation between (arg1) and (arg2), storing the result in (output)."
        }, {
            args: [arg("operand:operand"), arg("arg1:*any")],
            description: "Performs an operation on arg1, mutating it. Example: \`op abs xDiff\`",
            replace: ["op %1 %2 %2 0"]
        }
    ],
    wait: [{
            args: [arg("seconds:number")],
            description: "Waits for (seconds) seconds."
        }],
    lookup: [{
            args: [arg("type:lookupType"), arg("output:*any"), arg("n:number")],
            description: "Looks up the (n)th item, building, fluid, or unit type."
        }],
    end: [{
            args: [],
            description: "Terminates execution."
        }],
    jump: [{
            args: [arg("jumpAddress:jumpAddress"), arg("operandTest:operandTest"), arg("var1:valid?"), arg("var2:valid?")],
            description: "Jumps to an address or label if a condition is met."
        }],
    ubind: [{
            args: [arg("unitType:type")],
            description: "Binds a unit of (unitType). May return dead units if no live ones exist."
        }],
    ucontrol: [
        {
            args: ["idle"],
            description: "Tells the bound unit to continue current actions, except moving."
        }, {
            args: ["stop"],
            description: "Tells the bound unit to stop all actions."
        }, {
            args: ["move", arg("x:number"), arg("y:number")],
            description: "Tells the bound unit to move to (x,y). Does not wait for the unit to reach."
        }, {
            args: ["approach", arg("x:number"), arg("y:number"), arg("radius:number")],
            description: "Tells the bound unit to approach (x,y) but stay (radius) away. Does not wait for the unit to reach."
        }, {
            args: ["boost", arg("enable:boolean")],
            description: "Tells the bound unit to boost or not boost."
        }, {
            args: ["pathfind"],
            description: "Tells the bound unit to follow its normal AI."
        }, {
            args: ["target", arg("x:number"), arg("y:number"), arg("shoot:boolean")],
            description: "Tells the bound unit to target/shoot (x,y).\nWill not shoot if the position is outside the unit's range."
        }, {
            args: ["targetp", arg("unit:unit"), arg("shoot:boolean")],
            description: "Tells the bound unit to target/shoot a unit.\nWill not shoot if the position is outside the unit's range."
        }, {
            args: ["itemDrop", arg("building:building"), arg("amount:number")],
            description: "Tells the bound unit to drop at most (amount) items to (building)."
        }, {
            args: ["itemTake", arg("building:building"), arg("item:type"), arg("amount:number")],
            description: "Tells the bound unit to take at most (amount) of (item) from (building)."
        }, {
            args: ["payDrop"],
            description: "Tells the bound unit to drop its payload."
        }, {
            args: ["payTake", arg("takeUnits:boolean")],
            description: "Tells the bound unit to pick up a payload and if to take units."
        }, {
            args: ["payEnter"],
            description: "Tells the bound unit to enter a building(usually a reconstructor)."
        }, {
            args: ["mine", arg("x:number"), arg("y:number")],
            description: "Tells the unit to mine at (x,y)"
        }, {
            args: ["flag", arg("flag:number")],
            description: "Sets the flag of the bound unit."
        }, {
            args: ["build", arg("x:number"), arg("y:number"), arg("buildingType:type"), arg("rotation:number"), arg("config:valid")],
            description: "Tells the unit to build (block) with (rotation) and (config) at (x,y)."
        }, {
            args: ["getBlock", arg("x:number"), arg("y:number"), arg("buildingType:*type"), arg("building:*building")],
            description: "Gets the building type and building at (x,y) and outputs to (buildingType) and (building)."
        }, {
            args: ["within", arg("x:number"), arg("y:number"), arg("radius:number"), arg("output:*boolean")],
            description: "Checks if the unit is within (radius) tiles of (x,y) and outputs to (output)."
        },
    ],
    uradar: [
        {
            args: [arg("targetClass1:targetClass"), arg("targetClass2:targetClass"), arg("targetClass3:targetClass"), arg("sortCriteria:unitSortCriteria"), arg("sortOrder:number"), arg("output:*unit")],
            description: "Finds other units of specified class near the bound unit."
        }, {
            args: [arg("targetClass:targetClass"), arg("sortCriteria:unitSortCriteria"), arg("sortOrder:number"), arg("output:*unit")],
            replace: ["uradar %1 %1 %1 %2 %3 %4"],
            description: "Finds other units of specified class near the bound unit."
        },
    ],
    ulocate: [
        {
            args: ["ore", arg("ore:type"), arg("outX:*number"), arg("outY:*number"), arg("found:*boolean")],
            description: "Finds ores of specified type near the bound unit.",
            replace: ["ulocate ore core _ %2 %3 %4 %5 _"]
        }, {
            args: ["spawn", arg("outX:*number"), arg("outY:*number"), arg("found:*boolean")],
            description: "Finds enemy spawns near the bound unit.",
            replace: ["ulocate spawn core _ _ %2 %3 %4 _"]
        }, {
            args: ["damaged", arg("outX:*number"), arg("outY:*number"), arg("found:*boolean"), arg("building:*building")],
            description: "Finds damaged buildings near the bound unit.",
            replace: ["ulocate damaged core _ _ %2 %3 %4 %5"]
        }, {
            args: ["building", arg("buildingGroup:buildingGroup"), arg("enemy:boolean"), arg("outX:*number"), arg("outY:*number"), arg("found:*boolean"), arg("building:*building")],
            description: "Finds buildings of specified group near the bound unit.",
            replace: ["ulocate building %2 %3 _ %4 %5 %6 %7"]
        }, {
            args: [arg("oreOrSpawnOrAmogusOrDamagedOrBuilding:any"), arg("buildingGroup:buildingGroup"), arg("enemy:number"), arg("ore:type"), arg("outX:*number"), arg("outY:*number"), arg("found:*boolean"), arg("building:*building")],
            description: "The wack default ulocate signature, included for compatibility."
        }
    ],
});
let requiredVarCode = {
    "cookie": [
        `op mul cookie @thisx @maph`,
        `op add cookie @thisy cookie`
    ]
};
function exit(message) {
    console.error(message);
    process.exit(1);
}
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
    if (["true", "false"].includes(arg))
        return GenericArgType.boolean;
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
    if (arg == "")
        return false;
    if (arg == "0")
        return true;
    if (arg == undefined)
        return false;
    arg = arg.toLowerCase();
    if (!isGenericArg(type)) {
        return arg === type.toLowerCase();
    }
    let knownType = typeofArg(arg);
    if (knownType == type)
        return true;
    switch (type) {
        case GenericArgType.number:
            return knownType == GenericArgType.boolean || knownType == GenericArgType.variable;
        case GenericArgType.type:
        case GenericArgType.string:
        case GenericArgType.building:
        case GenericArgType.unit:
        case GenericArgType.function:
            return knownType == GenericArgType.variable;
        case GenericArgType.targetClass:
            return ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(arg);
        case GenericArgType.buildingGroup:
            return ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"].includes(arg);
        case GenericArgType.operandTest:
            return [
                "equal", "notequal", "strictequal", "greaterthan",
                "lessthan", "greaterthaneq", "lessthaneq", "always"
            ].includes(arg);
        case GenericArgType.operand:
            if (["atan2", "angle",
                "dst", "len"].includes(arg)) {
                console.warn(`${arg} is deprecated.`);
                return true;
            }
            return [
                "add", "sub", "mul", "div", "idiv", "mod", "pow",
                "equal", "notequal", "land", "lessthan", "lessthaneq",
                "greaterthan", "greaterthaneq", "strictequal",
                "shl", "shr", "or", "and", "xor", "not", "max",
                "min", "angle", "len", "noise", "abs", "log",
                "log10", "floor", "ceil", "sqrt", "rand", "sin",
                "cos", "tan", "asin", "acos", "atan"
            ].includes(arg);
        case GenericArgType.lookupType:
            return ["building", "unit", "fluid", "item"].includes(arg);
        case GenericArgType.targetClass:
            return [
                "any", "enemy", "ally", "player", "attacker",
                "flying", "boss", "ground"
            ].includes(arg);
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
function cleanLine(line) {
    return line
        .replace(/\/\/.*/g, "")
        .replace(/\/\*.*\*\//g, "")
        .replace(/(^[ \t]+)|([ \t]+$)/g, "");
}
function splitLineIntoArguments(line) {
    if (line.includes(`"`)) {
        let replacementLine = [];
        let isInString = false;
        for (let char of line) {
            if (char == `"`) {
                isInString = !isInString;
            }
            if (isInString && char == " ") {
                replacementLine.push("\u{F4321}");
            }
            else {
                replacementLine.push(char);
            }
        }
        return replacementLine.join("").split(" ").map(arg => arg.replaceAll("\u{F4321}", " "));
    }
    else {
        return line.split(" ");
    }
}
function compileMlogxToMlog(program, settings) {
    let [programType, requiredVars, author] = parsePreprocessorDirectives(program);
    let isMain = programType == "main" || settings.compilerOptions.mode == "single";
    function err(message) {
        if (settings.compilerOptions.compileWithErrors) {
            console.warn("Error: " + message);
        }
        else {
            throw new CompilerError(message);
        }
    }
    let outputData = [];
    for (let requiredVar of requiredVars) {
        if (requiredVarCode[requiredVar])
            outputData.push(...requiredVarCode[requiredVar]);
        else
            err("Unknown require " + requiredVar);
    }
    toNextLine: for (let line of program) {
        if (line.includes("\u{F4321}")) {
            console.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
        }
        let cleanedLine = cleanLine(line);
        if (cleanedLine == "") {
            if (!settings.compilerOptions.removeComments) {
                outputData.push(line);
            }
            continue toNextLine;
        }
        if (cleanedLine.match(/[^ ]+:$/)) {
            outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line);
            continue toNextLine;
        }
        let args = splitLineIntoArguments(cleanedLine)
            .map(arg => arg.startsWith("__") ? `${isMain ? "" : settings.filename.replace(/\.mlogx?/gi, "")}${arg}` : arg);
        let commandList = commands[args[0].toLowerCase()];
        if (!commandList) {
            err(`Unknown command ${args[0]}\nat \`${line}\``);
            continue toNextLine;
        }
        try {
            for (let command of commandList) {
                let result = checkCommand(args, command, cleanedLine);
                if (result.replace) {
                    outputData.push(...result.replace);
                    continue toNextLine;
                }
                else if (result.error) {
                    throw result.error;
                }
                else if (result.ok) {
                    outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line);
                    continue toNextLine;
                }
            }
        }
        catch (error) {
            error = error;
            if (commandList.length == 1) {
                err(error.message);
            }
            else {
                err(`Line
		\`${line}\`
		did not match any overloads for command ${args[0]}`);
            }
        }
        if (!commandList[0].replace) {
            outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line + " #Error");
        }
    }
    return outputData;
}
function checkTypes(program, settings) {
    function err(message) {
        throw new CompilerError(message);
    }
    let variables = {};
    for (let line of program) {
        let cleanedLine = cleanLine(line);
        let args = splitLineIntoArguments(line);
        let command = getCommandType(cleanedLine);
        if (command == null) {
            err(`Invalid command \`${line}\``);
        }
        let variablesUsed = getVariables(command);
    }
}
function getVariables(command) {
    return command.args.filter(arg => arg.variable);
}
function checkCommand(args, command, line) {
    let commandArguments = args.slice(1);
    if (commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.optional).length) {
        return {
            ok: false,
            error: {
                type: CommandErrorType.argumentCount,
                message: `Incorrect number of arguments for command ${args[0]}
	at \`${line}\`
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
            }
        };
    }
    for (let arg in commandArguments) {
        if (!isArgOfType(commandArguments[+arg], command.args[+arg].type)) {
            return {
                ok: false,
                error: {
                    type: CommandErrorType.type,
                    message: `Type mismatch: value ${commandArguments[+arg]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(commandArguments[+arg])}
	at \`${line}\``
                }
            };
        }
    }
    if (command.replace) {
        return {
            ok: true,
            replace: command.replace.map(replaceLine => {
                for (let i = 1; i < args.length; i++) {
                    replaceLine = replaceLine.replace(new RegExp(`%${i}`, "g"), args[i]);
                }
                return replaceLine;
            }),
        };
    }
    return {
        ok: true
    };
}
function isCommand(line, command) {
    let args = splitLineIntoArguments(line);
    let commandArguments = args.slice(1);
    if (commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.optional).length) {
        return false;
    }
    for (let arg in commandArguments) {
        if (!isArgOfType(commandArguments[+arg], command.args[+arg].type)) {
            return false;
        }
    }
    return true;
}
function getCommandType(cleanedLine) {
    let args = splitLineIntoArguments(cleanedLine);
    let commandList = commands[args[0]];
    for (let possibleCommand of commandList) {
        if (isCommand(cleanedLine, possibleCommand)) {
            return possibleCommand;
        }
        ;
    }
    return null;
}
function parsePreprocessorDirectives(data) {
    let program_type = "unknown";
    let required_vars = [];
    let author = "unknown";
    for (let line of data) {
        if (line.startsWith("#require ")) {
            required_vars.push(...line.split("#require ")[1].split(",").map(el => el.replaceAll(" ", "")).filter(el => el != ""));
        }
        if (line.startsWith("#program_type ")) {
            let type = line.split("#program_type ")[1];
            if (type == "never" || type == "main" || type == "function") {
                program_type = type;
            }
        }
        if (line.startsWith("#author ")) {
            author = line.split("#author ")[1];
        }
    }
    return [program_type, required_vars, author];
}
function parseArgs(args) {
    let parsedArgs = {};
    let argName = "";
    let mainArgs = [];
    for (let arg of args) {
        if (arg.startsWith("--")) {
            argName = arg.slice(2);
            parsedArgs[arg.toLowerCase().slice(2)] = "null";
        }
        else if (argName) {
            parsedArgs[argName] = arg.toLowerCase();
            argName = "null";
        }
        else {
            mainArgs.push(arg);
        }
    }
    return [parsedArgs, mainArgs];
}
function main() {
    if (programArgs["help"]) {
        console.log(`Usage: compile [--help] [--directory <directory>] [--info <command>] directory
\t--help\tDisplays this help message and exits.
\t--info\tShows information about a command.
directory: The directory to compile in.
`);
        process.exit(0);
    }
    if (programArgs["info"]) {
        if (programArgs["info"] == "null")
            return console.log("Please specify a command to get information on.");
        if (!commands[programArgs["info"]])
            console.log(`Unknown command ${programArgs["info"]}`);
        else
            console.log(`${programArgs["info"]}
Usage:

${commands[programArgs["info"]].map(command => programArgs["info"] + " " + command.args
                .map(arg => arg.toString())
                .join(" ") + "\n" + command.description).join("\n\n")}
`);
        process.exit(0);
    }
    if (fileNames[0] == undefined) {
        exit("Please specify a project or directory to compile in");
    }
    try {
        if (fs.existsSync(fileNames[0]) && fs.lstatSync(fileNames[0]).isDirectory()) {
            console.log("Compiling folder " + fileNames[0]);
        }
        else {
            exit("Invalid directory specified!");
        }
    }
    catch (err) {
        exit("Invalid directory specified.");
    }
    compileDirectory(fileNames[0]);
}
function compileDirectory(directory) {
    let settings = defaultConfig;
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
    if (!(fs.existsSync(path.join(fileNames[0], "src")) &&
        fs.lstatSync(path.join(fileNames[0], "src")).isDirectory())
        && settings.compilerOptions.mode == "project") {
        console.error(`Compiler mode set to "project" but no src directory found.`);
        settings.compilerOptions.mode = "single";
    }
    const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
    const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
    if (settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    let filelist_mlogx = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlogx$/));
    let filelist_mlog = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/.mlog$/));
    let filelist_stdlib = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/.mlog$/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let stdlibData = {};
    let mainData = "";
    if (settings.compilerOptions.include.includes("stdlib")) {
        for (let filename of filelist_stdlib) {
            stdlibData[filename] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8');
        }
    }
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split("\r\n");
        let outputData;
        try {
            outputData = compileMlogxToMlog(data, {
                filename,
                ...settings
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
        if (settings.compilerOptions.mode == "single") {
            outputData += "\r\nend\r\n#stdlib\r\n\r\n";
            outputData += Object.values(stdlibData).join("\r\nend\r\n\r\n");
            outputData += "\r\n" + compilerMark;
        }
        fs.writeFileSync(path.join(outputDirectory, filename.slice(0, -1)), outputData);
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
                compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8');
            }
            else {
                mainData = fs.readFileSync(`src/${filename}`, 'utf-8');
            }
        }
        console.log("Compiled all files successfully.");
        console.log("Assembling output:");
        let outputData = mainData;
        outputData += "\r\nend\r\n#functions\r\n\r\n" + Object.values(compiledData).join("\r\nend\r\n\r\n");
        if (settings.compilerOptions.include.includes("stdlib")) {
            outputData += "\r\nend\r\n#stdlib\r\n\r\n" + Object.values(stdlibData).join("\r\nend\r\n\r\n");
        }
        fs.writeFileSync(path.join(directory, "out.mlog"), outputData);
        console.log("Done!");
    }
    else {
        console.log("Done!");
    }
}
main();
