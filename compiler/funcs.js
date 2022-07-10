import { Arg, CompilerError } from "./classes.js";
import commands from "./commands.js";
import { GenericArgType } from "./types.js";
import * as readline from "readline";
import { buildingNameRegex } from "./consts.js";
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
            let processedCommand = {
                description: command.description,
                name,
                args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg)) : [],
                getVariablesDefined: command.getVariablesDefined
            };
            if (command.replace instanceof Array) {
                processedCommand.replace = function (args) {
                    return command.replace.map(replaceLine => {
                        for (let i = 1; i < args.length; i++) {
                            replaceLine = replaceLine.replace(new RegExp(`%${i}`, "g"), args[i]);
                        }
                        return replaceLine;
                    });
                };
            }
            else if (typeof command.replace == "function") {
                processedCommand.replace = command.replace;
            }
            out[name].push(processedCommand);
        }
    }
    return out;
}
export function isGenericArg(val) {
    return GenericArgType[val] != undefined;
}
export function typeofArg(arg) {
    if (arg == "")
        return GenericArgType.invalid;
    if (arg == undefined)
        return GenericArgType.invalid;
    if (arg.match(/@[a-z\-]+/i)) {
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
        if (arg == "@tick")
            return GenericArgType.number;
        if (arg == "@mapw")
            return GenericArgType.number;
        if (arg == "@maph")
            return GenericArgType.number;
        if (arg == "@counter")
            return GenericArgType.variable;
        return GenericArgType.type;
    }
    if (arg.match(/:\w+/i))
        return GenericArgType.ctype;
    if (["null"].includes(arg))
        return GenericArgType.null;
    if (["equal", "notEqual", "strictEqual", "greaterThan", "lessThan", "greaterThanEq", "lessThanEq", "always"].includes(arg))
        return GenericArgType.operandTest;
    if (["true", "false"].includes(arg))
        return GenericArgType.boolean;
    if (arg.match(/^-?\d+(\.\d+)?$/))
        return GenericArgType.number;
    if (arg.match(/^"[^"]*"$/gi))
        return GenericArgType.string;
    if (arg.match(buildingNameRegex))
        return GenericArgType.building;
    if (arg.match(/^[^"]+$/i))
        return GenericArgType.variable;
    return GenericArgType.invalid;
}
export function isArgOfType(argToCheck, arg) {
    if (arg.type === GenericArgType.any)
        return true;
    if (arg.type === GenericArgType.valid)
        return true;
    if (argToCheck == "")
        return false;
    if (argToCheck == undefined)
        return false;
    if (!isGenericArg(arg.type)) {
        return argToCheck === arg.type;
    }
    let knownType = typeofArg(argToCheck);
    if (arg.isVariable)
        return knownType == GenericArgType.variable;
    if (knownType == arg.type)
        return true;
    switch (arg.type) {
        case GenericArgType.ctype:
            return /:\w+/.test(argToCheck);
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
                "equal", "notEqual", "strictEqual", "greaterThan",
                "lessThan", "greaterThanEq", "lessThanEq", "always"
            ].includes(argToCheck);
        case GenericArgType.operand:
            if (["atan2", "dst"].includes(argToCheck)) {
                console.warn(`${argToCheck} is deprecated.`);
                return true;
            }
            return [
                "add", "sub", "mul", "div", "idiv", "mod", "pow",
                "equal", "notEqual", "land", "lessThan", "lessThanEq",
                "greaterThan", "greaterThanEq", "strictEqual",
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
    return removeTrailingSpaces(removeComments(line));
}
export function removeTrailingSpaces(line) {
    return line
        .replace(/(^[ \t]+)|([ \t]+$)/g, "");
}
export function replaceCompilerConstants(line, variables) {
    for (let [key, value] of Object.entries(variables)) {
        line = line.replaceAll(`$${key}`, value);
    }
    return line;
}
export function parseIcons(data) {
    let icons = {};
    for (let line of data) {
        try {
            icons["_" + line.split("=")[1].split("|")[0]] = String.fromCodePoint(parseInt(line.split("=")[0]));
        }
        catch (err) {
        }
    }
    return icons;
}
export function addJumpLabels(code) {
    let lastJumpNameIndex = 0;
    let jumps = {};
    let transformedCode = [];
    let outputCode = [];
    let cleanedCode = code.map(line => cleanLine(line)).filter(line => line);
    for (let line of cleanedCode) {
        let label = getJumpLabelUsed(line);
        if (label) {
            if (label == "0") {
                jumps[label] = "0";
            }
            else if (!isNaN(parseInt(label))) {
                jumps[label] = `jump_${lastJumpNameIndex}_`;
                lastJumpNameIndex += 1;
            }
        }
    }
    for (let line of cleanedCode) {
        if (getCommandDefinition(line) == commands.jump[0]) {
            let label = getJumpLabelUsed(line);
            if (label == undefined)
                throw new Error("invalid jump statement");
            transformedCode.push(transformCommand(splitLineIntoArguments(line), commands.jump[0], (arg, carg) => jumps[arg] ?? (() => { throw new Error(`Unknown jump label ${arg}`); })(), (arg, carg) => carg.isGeneric && carg.type == GenericArgType.jumpAddress).join(" "));
        }
        else {
            transformedCode.push(line);
        }
    }
    for (let lineNumber in transformedCode) {
        const jumpLabel = jumps[(+lineNumber).toString()];
        if (jumpLabel) {
            outputCode.push(`${jumpLabel}: #AUTOGENERATED`);
        }
        outputCode.push(transformedCode[lineNumber]);
    }
    return outputCode;
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
    for (let _char in charsplitInput) {
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
        else if (lastChar === "/" && char === "/") {
            state.inSComment = true;
            parsedChars.pop();
            lastChar = char;
            continue;
        }
        lastChar = char;
        parsedChars.push(char);
    }
    return parsedChars.join("");
}
export function getParameters(program) {
    let functionLine = program.filter(line => line.startsWith("#function "))[0];
    return functionLine
        ?.match(/(?<=#function .*?\().*?(?=\))/)?.[0]
        ?.split(",")
        .map(arg => removeTrailingSpaces(arg).split(":"))
        .filter(arg => arg.length == 2) ?? [];
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
export function transformVariables(args, commandDefinition, transformFunction) {
    return transformCommand(args, commandDefinition, transformFunction, (arg, commandArg) => (commandArg?.isVariable || (acceptsVariable(commandArg)
        && isArgOfType(arg, new Arg(GenericArgType.variable)))) && arg !== "_");
}
export function transformCommand(args, commandDefinition, transformFunction, filterFunction) {
    return args
        .map((arg, index) => [arg, commandDefinition.args[index - 1]])
        .map(([arg, commandArg]) => (commandArg && filterFunction(arg, commandArg))
        ? transformFunction(arg, commandArg) : arg);
}
export function addNamespaces(variable, stack) {
    return `_${stack.filter(el => el.type == "namespace").map(el => el.name).join("_")}_${variable}`;
}
export function addNamespacesToLine(args, commandDefinition, stack) {
    if (stack.length == 0)
        return args.join(" ");
    return transformVariables(args, commandDefinition, (variable) => addNamespaces(variable, stack)).join(" ");
}
export function getVariablesDefined(args, commandDefinition) {
    if (commandDefinition.getVariablesDefined) {
        return commandDefinition.getVariablesDefined(args);
    }
    return args
        .map((arg, index) => [arg, commandDefinition.args[index]])
        .filter(([arg, commandArg]) => commandArg && commandArg.isVariable && arg !== "_")
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
        .filter(([arg, commandArg]) => typeofArg(arg) == GenericArgType.variable && acceptsVariable(commandArg) && arg != "_").map(([arg, commandArg]) => [arg, commandArg.type]);
}
export function getJumpLabelUsed(line) {
    let args = splitLineIntoArguments(line);
    if (args[0] == "jump")
        return args[1];
    return null;
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
        return true;
    switch (input) {
        case GenericArgType.any: return true;
        case GenericArgType.number: return output == GenericArgType.boolean;
        case GenericArgType.boolean: return output == GenericArgType.number;
        default: return false;
    }
}
export function acceptsVariable(arg) {
    if (arg == undefined)
        return false;
    if (arg.isVariable)
        return false;
    if (arg.isGeneric)
        return [
            GenericArgType.boolean, GenericArgType.building,
            GenericArgType.number, GenericArgType.string,
            GenericArgType.type, GenericArgType.unit,
            GenericArgType.valid
        ].includes(arg.type);
    else
        return false;
}
export function getLabel(cleanedLine) {
    return cleanedLine.match(/^[^ ]+(?=:$)/)?.[0];
}
export function err(message, settings) {
    if (settings.compilerOptions.compileWithErrors) {
        console.warn("Error: " + message);
    }
    else {
        throw new CompilerError(message);
    }
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
