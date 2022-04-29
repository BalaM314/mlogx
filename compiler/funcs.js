import { Arg } from "./classes.js";
import commands from "./commands.js";
import { CommandErrorType, GenericArgType } from "./types.js";
import * as readline from "readline";
export function processCommands(preprocessedCommands) {
    function arg(str) {
        if (!str.includes(":")) {
            return new Arg(str, str, false, false, false);
        }
        let [name, type] = str.split(":");
        let isVariable = false;
        let isOptional = false;
        if (type.startsWith("*")) {
            isVariable = true;
            type = type.substring(1);
        }
        if (type.endsWith("?")) {
            isOptional = true;
            type = type.substring(0, type.length - 1);
        }
        return new Arg(type, name, isOptional, true, isVariable);
    }
    let out = {};
    for (let [name, commands] of Object.entries(preprocessedCommands)) {
        out[name] = [];
        for (let command of commands) {
            out[name].push({
                ...command,
                name,
                args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg)) : []
            });
        }
    }
    return out;
}
export function isGenericArg(val) {
    return GenericArgType[val] != undefined;
}
export function typeofArg(arg) {
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
export function isArgOfType(argToCheck, arg) {
    if (arg.type === GenericArgType.any)
        return true;
    if (argToCheck == "")
        return false;
    if (argToCheck == "0")
        return true;
    if (argToCheck == undefined)
        return false;
    argToCheck = argToCheck.toLowerCase();
    if (!isGenericArg(arg.type)) {
        return argToCheck === arg.type.toLowerCase();
    }
    let knownType = typeofArg(argToCheck);
    if (arg.isVariable)
        return knownType == GenericArgType.variable;
    if (knownType == arg.type)
        return true;
    switch (arg.type) {
        case GenericArgType.number:
            return knownType == GenericArgType.boolean || knownType == GenericArgType.variable;
        case GenericArgType.jumpAddress:
            return knownType == GenericArgType.number || knownType == GenericArgType.variable;
        case GenericArgType.boolean:
            return knownType == GenericArgType.number || knownType == GenericArgType.variable;
        case GenericArgType.type:
        case GenericArgType.string:
        case GenericArgType.building:
        case GenericArgType.unit:
        case GenericArgType.function:
            return knownType == GenericArgType.variable;
        case GenericArgType.targetClass:
            return ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"].includes(argToCheck);
        case GenericArgType.buildingGroup:
            return ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"].includes(argToCheck);
        case GenericArgType.operandTest:
            return [
                "equal", "notequal", "strictequal", "greaterthan",
                "lessthan", "greaterthaneq", "lessthaneq", "always"
            ].includes(argToCheck);
        case GenericArgType.operand:
            if (["atan2", "angle",
                "dst", "len"].includes(argToCheck)) {
                console.warn(`${argToCheck} is deprecated.`);
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
            ].includes(argToCheck);
        case GenericArgType.lookupType:
            return ["building", "unit", "fluid", "item"].includes(argToCheck);
        case GenericArgType.targetClass:
            return [
                "any", "enemy", "ally", "player", "attacker",
                "flying", "boss", "ground"
            ].includes(argToCheck);
        case GenericArgType.unitSortCriteria:
            return ["distance", "health", "shield", "armor", "maxHealth"].includes(argToCheck);
        case GenericArgType.valid:
            return true;
    }
    return false;
}
export function cleanLine(line) {
    return removeComments(line
        .replace(/\/\*.*\*\//g, "")
        .replace(/(^[ \t]+)|([ \t]+$)/g, ""));
}
export function removeComments(line) {
    let charsplitInput = line.split("");
    let parsedChars = [];
    let lastChar = "";
    let state = {
        inSComment: false,
        inMComment: false,
        inDString: false
    };
    for (var _char in charsplitInput) {
        let char = charsplitInput[_char];
        if (typeof char !== "string")
            continue;
        if (state.inSComment) {
            if (char === "\n") {
                state.inSComment = false;
            }
            lastChar = char;
            continue;
        }
        else if (state.inMComment) {
            if (lastChar === "*" && char === "/") {
                state.inMComment = false;
            }
            lastChar = char;
            continue;
        }
        else if (state.inDString) {
            if (lastChar !== `\\` && char === `"`) {
                state.inDString = false;
            }
        }
        else if (char === "#") {
            state.inSComment = true;
            lastChar = char;
            continue;
        }
        else if (lastChar === "/" && char === "*") {
            state.inMComment = true;
            parsedChars.pop();
            lastChar = char;
            continue;
        }
        else if (lastChar !== `\\` && char === `"`) {
            if (char === "\"" && lastChar !== `\\`) {
                state.inDString = true;
            }
        }
        lastChar = char;
        parsedChars.push(char);
    }
    return parsedChars.join("");
}
export function splitLineIntoArguments(line) {
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
export function getVariablesDefined(args, commandDefinition) {
    if (commandDefinition.name == "set") {
        return [[args[0], typeofArg(args[1])]];
    }
    return args
        .map((arg, index) => [arg, commandDefinition.args[index]])
        .filter(([arg, commandArg]) => commandArg.isVariable)
        .map(([arg, commandArg]) => [arg, commandArg.type]);
}
export function getAllPossibleVariablesUsed(command) {
    let args = splitLineIntoArguments(command).slice(1);
    let variablesUsed_s = [];
    for (let commandDefinition of getCommandDefinitions(command)) {
        variablesUsed_s.push(getVariablesUsed(args, commandDefinition));
    }
    ;
    let variablesToReturn = {};
    for (let variablesUsed of variablesUsed_s) {
        for (let [variableName, variableType] of variablesUsed) {
            if (!variablesToReturn[variableName])
                variablesToReturn[variableName] = [variableType];
            if (!variablesToReturn[variableName].includes(variableType))
                variablesToReturn[variableName].push(variableType);
        }
    }
    return Object.entries(variablesToReturn);
}
export function getVariablesUsed(args, commandDefinition) {
    return args
        .map((arg, index) => [arg, commandDefinition.args[index]])
        .filter(([arg, commandArg]) => typeofArg(arg) == GenericArgType.variable && acceptsVariable(commandArg)).map(([arg, commandArg]) => [arg, commandArg.type]);
}
export function areAnyOfInputsCompatibleWithType(inputs, output) {
    for (let input of inputs) {
        if (typesAreCompatible(input, output) || typesAreCompatible(output, input))
            return true;
    }
    return false;
}
export function typesAreCompatible(input, output) {
    if (input == output)
        return true;
    if (output == GenericArgType.any)
        return true;
    if (output == GenericArgType.valid)
        return ![GenericArgType.null].includes(input);
    switch (input) {
        case GenericArgType.any: return true;
        case GenericArgType.number: return output == GenericArgType.boolean;
        case GenericArgType.boolean: return output == GenericArgType.number;
        default: return false;
    }
}
export function acceptsVariable(arg) {
    if (arg.isVariable)
        return false;
    if (isGenericArg(arg.type))
        return [
            GenericArgType.boolean, GenericArgType.building,
            GenericArgType.number, GenericArgType.string,
            GenericArgType.type, GenericArgType.unit,
            GenericArgType.valid
        ].includes(arg.type);
    else
        return false;
}
export function checkCommand(command, line) {
    let args = splitLineIntoArguments(line);
    let commandArguments = args.slice(1);
    if (commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.isOptional).length) {
        return {
            ok: false,
            error: {
                type: CommandErrorType.argumentCount,
                message: `Incorrect number of arguments for command "${args[0]}"
	at \`${line}\`
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`
            }
        };
    }
    for (let arg in commandArguments) {
        if (!isArgOfType(commandArguments[+arg], command.args[+arg])) {
            return {
                ok: false,
                error: {
                    type: CommandErrorType.type,
                    message: `Type mismatch: value "${commandArguments[+arg]}" was expected to be of type "${command.args[+arg].isVariable ? "variable" : command.args[+arg].type}", but was of type "${typeofArg(commandArguments[+arg])}"
	at \`${line}\``
                }
            };
        }
    }
    if (args[0] == "sensor" && args[1].match(/(\w+)\.(\w+)/i)) {
        let [_, target, property] = args[1].match(/(\w+)\.(\w+)/i);
        return {
            ok: true,
            replace: [`sensor ${args[1]} ${target == "unit" ? "@unit" : target} @${property}`]
        };
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
export function isCommand(line, command) {
    let args = splitLineIntoArguments(line);
    let commandArguments = args.slice(1);
    if (commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.isOptional).length) {
        return false;
    }
    for (let arg in commandArguments) {
        if (!isArgOfType(commandArguments[+arg], command.args[+arg])) {
            return false;
        }
    }
    return true;
}
export function getCommandDefinition(cleanedLine) {
    return getCommandDefinitions(cleanedLine)[0];
}
export function getCommandDefinitions(cleanedLine) {
    let args = splitLineIntoArguments(cleanedLine);
    let commandList = commands[args[0]];
    let possibleCommands = [];
    if (commandList == null)
        return [];
    for (let possibleCommand of commandList) {
        if (isCommand(cleanedLine, possibleCommand)) {
            possibleCommands.push(possibleCommand);
        }
        ;
    }
    return possibleCommands;
}
export function parsePreprocessorDirectives(data) {
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
export function parseArgs(args) {
    let parsedArgs = {};
    let argName = "";
    let mainArgs = [];
    for (let arg of args) {
        if (arg.startsWith("--")) {
            argName = arg.slice(2);
            parsedArgs[arg.toLowerCase().slice(2)] = "null";
        }
        else if (argName) {
            parsedArgs[argName] = arg;
            argName = "null";
        }
        else {
            mainArgs.push(arg);
        }
    }
    return [parsedArgs, mainArgs];
}
export function exit(message) {
    console.error(message);
    process.exit(1);
}
export function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}
