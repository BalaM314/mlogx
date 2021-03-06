import { Arg, Log } from "./classes.js";
import commands from "./commands.js";
import { CommandErrorType, GAT } from "./types.js";
import * as readline from "readline";
import { buildingNameRegex } from "./consts.js";
import chalk from "chalk";
export function processCommands(preprocessedCommands) {
    function arg(str) {
        if (!str.includes(":")) {
            return new Arg(str, str, false, false, false);
        }
        const [name, type] = str.split(":");
        let modifiedType = type;
        let isVariable = false;
        let isOptional = false;
        if (type.startsWith("*")) {
            isVariable = true;
            modifiedType = type.substring(1);
        }
        if (type.endsWith("?")) {
            isOptional = true;
            modifiedType = type.substring(0, type.length - 1);
        }
        return new Arg(modifiedType, name, isOptional, true, isVariable);
    }
    const out = {};
    for (const [name, commands] of Object.entries(preprocessedCommands)) {
        out[name] = [];
        for (const command of commands) {
            const processedCommand = {
                description: command.description,
                name,
                args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg)) : [],
                getVariablesDefined: command.getVariablesDefined,
                getVariablesUsed: command.getVariablesUsed
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
    return GAT[val] != undefined;
}
export function typeofArg(arg) {
    if (arg == "")
        return GAT.invalid;
    if (arg == undefined)
        return GAT.invalid;
    if (arg.match(/@[a-z-]+/i)) {
        if (arg == "@unit")
            return GAT.unit;
        if (arg == "@thisx")
            return GAT.number;
        if (arg == "@thisy")
            return GAT.number;
        if (arg == "@this")
            return GAT.building;
        if (arg == "@ipt")
            return GAT.number;
        if (arg == "@links")
            return GAT.number;
        if (arg == "@time")
            return GAT.number;
        if (arg == "@tick")
            return GAT.number;
        if (arg == "@mapw")
            return GAT.number;
        if (arg == "@maph")
            return GAT.number;
        if (arg == "@counter")
            return GAT.variable;
        return GAT.type;
    }
    if (arg.match(/:\w+/i))
        return GAT.ctype;
    if (["null"].includes(arg))
        return GAT.null;
    if (["equal", "notEqual", "strictEqual", "greaterThan", "lessThan", "greaterThanEq", "lessThanEq", "always"].includes(arg))
        return GAT.operandTest;
    if (["true", "false"].includes(arg))
        return GAT.boolean;
    if (arg.match(/^-?\d+(\.\d+)?$/))
        return GAT.number;
    if (arg.match(/^"[^"]*"$/gi))
        return GAT.string;
    if (arg.match(buildingNameRegex))
        return GAT.building;
    if (arg.match(/^[^"]+$/i))
        return GAT.variable;
    return GAT.invalid;
}
export function isArgOfType(argToCheck, arg) {
    if (arg.type === GAT.any)
        return true;
    if (arg.type === GAT.valid)
        return true;
    if (argToCheck == "")
        return false;
    if (argToCheck == undefined)
        return false;
    if (!isGenericArg(arg.type)) {
        return argToCheck === arg.type;
    }
    const knownType = typeofArg(argToCheck);
    if (arg.isVariable)
        return knownType == GAT.variable;
    if (knownType == arg.type)
        return true;
    switch (arg.type) {
        case GAT.ctype:
            return /:\w+/.test(argToCheck);
        case GAT.number:
            return knownType == GAT.boolean || knownType == GAT.variable;
        case GAT.jumpAddress:
            return knownType == GAT.number || knownType == GAT.variable;
        case GAT.boolean:
            return knownType == GAT.number || knownType == GAT.variable;
        case GAT.type:
        case GAT.string:
        case GAT.building:
        case GAT.unit:
        case GAT.function:
            return knownType == GAT.variable;
        case GAT.buildingGroup:
            return ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"].includes(argToCheck);
        case GAT.operandTest:
            return [
                "equal", "notEqual", "strictEqual", "greaterThan",
                "lessThan", "greaterThanEq", "lessThanEq", "always"
            ].includes(argToCheck);
        case GAT.operandSingle:
            return [
                "not", "max", "abs", "log", "log10",
                "floor", "ceil", "sqrt", "rand", "sin",
                "cos", "tan", "asin", "acos", "atan"
            ].includes(argToCheck);
        case GAT.operandDouble:
            if (["atan2", "dst"].includes(argToCheck)) {
                Log.warn(`${argToCheck} is deprecated.`);
                return true;
            }
            return [
                "add", "sub", "mul", "div", "idiv", "mod", "pow",
                "equal", "notEqual", "land", "lessThan",
                "lessThanEq", "greaterThan", "greaterThanEq",
                "strictEqual", "shl", "shr", "or", "and",
                "xor", "min", "angle", "len", "noise",
            ].includes(argToCheck);
        case GAT.lookupType:
            return ["building", "unit", "fluid", "item"].includes(argToCheck);
        case GAT.targetClass:
            return [
                "any", "enemy", "ally", "player", "attacker",
                "flying", "boss", "ground"
            ].includes(argToCheck);
        case GAT.unitSortCriteria:
            return ["distance", "health", "shield", "armor", "maxHealth"].includes(argToCheck);
        case GAT.valid:
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
    if (!line.includes("$"))
        return line;
    for (const [key, value] of Object.entries(variables)) {
        line = line.replace(new RegExp(`(\\$\\(${key}\\))|(\\$${key})`, "g"), value);
    }
    return line;
}
export function parseIcons(data) {
    const icons = {};
    for (const line of data) {
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
    const jumps = {};
    const transformedCode = [];
    const outputCode = [];
    const cleanedCode = code.map(line => cleanLine(line)).filter(line => line);
    for (const line of cleanedCode) {
        const label = getJumpLabelUsed(line);
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
    for (const line of cleanedCode) {
        if (getCommandDefinition(line) == commands.jump[0]) {
            const label = getJumpLabelUsed(line);
            if (label == undefined)
                throw new Error("invalid jump statement");
            transformedCode.push(transformCommand(splitLineIntoArguments(line), commands.jump[0], (arg) => jumps[arg] ?? (() => { throw new Error(`Unknown jump label ${arg}`); })(), (arg, carg) => carg.isGeneric && carg.type == GAT.jumpAddress).join(" "));
        }
        else {
            transformedCode.push(line);
        }
    }
    for (const lineNumber in transformedCode) {
        const jumpLabel = jumps[(+lineNumber).toString()];
        if (jumpLabel) {
            outputCode.push(`${jumpLabel}: #AUTOGENERATED`);
        }
        outputCode.push(transformedCode[lineNumber]);
    }
    return outputCode;
}
export function removeComments(line) {
    const charsplitInput = line.split("");
    const parsedChars = [];
    let lastChar = "";
    const state = {
        inSComment: false,
        inMComment: false,
        inDString: false
    };
    for (const _char in charsplitInput) {
        const char = charsplitInput[_char];
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
    const functionLine = program.filter(line => line.startsWith("#function "))[0];
    return functionLine
        ?.match(/(?<=#function .*?\().*?(?=\))/)?.[0]
        ?.split(",")
        .map(arg => removeTrailingSpaces(arg).split(":"))
        .filter(arg => arg.length == 2) ?? [];
}
export function splitLineIntoArguments(line) {
    if (line.includes(`"`)) {
        const replacementLine = [];
        let isInString = false;
        for (const char of line) {
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
        && isArgOfType(arg, new Arg(GAT.variable)))) && arg !== "_");
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
export function prependFilenameToArg(arg, isMain, filename) {
    return arg.startsWith("__") ? `__${isMain ? "" : filename.replace(/\.mlogx?/gi, "")}${arg}` : arg;
}
export function addNamespacesToLine(args, commandDefinition, stack) {
    if (!inNamespace(stack))
        return args.join(" ");
    return transformVariables(args, commandDefinition, (variable) => addNamespaces(variable, stack)).join(" ");
}
export function getVariablesDefined(compiledCommandArgs, compiledCommandDefinition, uncompiledCommandArgs = compiledCommandArgs, uncompiledCommandDefinition = compiledCommandDefinition) {
    if (uncompiledCommandDefinition.getVariablesDefined) {
        return uncompiledCommandDefinition.getVariablesDefined([uncompiledCommandDefinition.name, ...uncompiledCommandArgs]);
    }
    if (compiledCommandDefinition.getVariablesDefined) {
        return compiledCommandDefinition.getVariablesDefined([compiledCommandDefinition.name, ...compiledCommandArgs]);
    }
    return compiledCommandArgs
        .map((arg, index) => [arg, compiledCommandDefinition.args[index]])
        .filter(([arg, commandArg]) => commandArg && commandArg.isVariable && arg !== "_")
        .map(([arg, commandArg]) => [arg, commandArg.type]);
}
export function removeUnusedJumps(compiledProgram, jumpLabelUsages) {
    return compiledProgram.filter(line => !getLabel(line) || getLabel(line) in jumpLabelUsages);
}
export function inForLoop(stack) {
    return stack.filter(el => el.type == "&for").length != 0;
}
export function topForLoop(stack) {
    return stack.filter(el => el.type == "&for").at(-1);
}
export function inNamespace(stack) {
    return stack.filter(el => el.type == "namespace").length != 0;
}
export function getAllPossibleVariablesUsed(compiledLine, uncompiledLine = compiledLine) {
    const args = splitLineIntoArguments(compiledLine).slice(1);
    const variablesUsed_s = [];
    for (const commandDefinition of getCommandDefinitions(compiledLine)) {
        variablesUsed_s.push(getVariablesUsed(args, commandDefinition));
    }
    const variablesToReturn = {};
    for (const variablesUsed of variablesUsed_s) {
        for (const [variableName, variableType] of variablesUsed) {
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
        .filter(([arg, commandArg]) => isArgOfType(arg, new Arg(GAT.variable)) && acceptsVariable(commandArg) && arg != "_").map(([arg, commandArg]) => [arg, commandArg.type]);
}
export function getJumpLabelUsed(line) {
    const args = splitLineIntoArguments(line);
    if (args[0] == "jump")
        return args[1];
    return null;
}
export function areAnyOfInputsCompatibleWithType(inputs, output) {
    for (const input of inputs) {
        if (typesAreCompatible(input, output) || typesAreCompatible(output, input))
            return true;
    }
    return false;
}
export function typesAreCompatible(input, output) {
    if (input == output)
        return true;
    if (output == GAT.any)
        return true;
    if (output == GAT.valid)
        return true;
    if (output == GAT.null)
        return true;
    switch (input) {
        case GAT.any: return true;
        case GAT.number: return output == GAT.boolean;
        case GAT.boolean: return output == GAT.number;
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
            GAT.boolean, GAT.building,
            GAT.number, GAT.string,
            GAT.type, GAT.unit,
            GAT.valid
        ].includes(arg.type);
    else
        return false;
}
export function getLabel(cleanedLine) {
    return cleanedLine.match(/^[^ ]+(?=:$)/)?.[0];
}
export function isCommand(line, command) {
    const args = splitLineIntoArguments(line);
    const commandArguments = args.slice(1);
    if (commandArguments.length > command.args.length || commandArguments.length < command.args.filter(arg => !arg.isOptional).length) {
        return [false, {
                type: CommandErrorType.argumentCount,
                message: `Incorrect number of arguments for command "${args[0]}", see \`mlogx info ${args[0]}\``
            }];
    }
    for (const arg in commandArguments) {
        if (!isArgOfType(commandArguments[+arg], command.args[+arg])) {
            if (command.args[+arg].isGeneric)
                return [false, {
                        type: CommandErrorType.type,
                        message: `Type mismatch: value "${commandArguments[+arg]}" was expected to be of type "${command.args[+arg].isVariable ? "variable" : command.args[+arg].type}", but was of type "${typeofArg(commandArguments[+arg])}"`
                    }];
            else
                return [false, {
                        type: CommandErrorType.badStructure,
                        message: `Incorrect argument: value "${commandArguments[+arg]}" was expected to be "${command.args[+arg].type}", but was "${typeofArg(commandArguments[+arg])}"`
                    }];
        }
    }
    return [true, null];
}
export function formatLine(line, settings) {
    return chalk.gray(`${settings.filename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}
export function formatLineWithPrefix(line, settings, prefix = "\t\tat ") {
    return chalk.gray(`${prefix}${settings.filename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}
export function getCommandDefinition(cleanedLine) {
    return getCommandDefinitions(cleanedLine)[0];
}
export function getCommandDefinitions(cleanedLine, returnErrors = false) {
    const args = splitLineIntoArguments(cleanedLine);
    const commandList = commands[args[0]];
    const possibleCommands = [];
    const errors = [];
    if (commandList == undefined) {
        return returnErrors ? [[], [{
                    type: CommandErrorType.noCommand,
                    message: `Command ${args[0]} does not exist.`
                }]] : [];
    }
    for (const possibleCommand of commandList) {
        const result = isCommand(cleanedLine, possibleCommand);
        if (result[0]) {
            possibleCommands.push(possibleCommand);
        }
        else {
            errors.push(result[1]);
        }
    }
    if (returnErrors)
        return [possibleCommands, errors];
    else
        return possibleCommands;
}
export function parsePreprocessorDirectives(data) {
    let program_type = "unknown";
    const required_vars = [];
    let author = "unknown";
    for (const line of data) {
        if (line.startsWith("#require ")) {
            required_vars.push(...line.split("#require ")[1].split(",").map(el => el.replaceAll(" ", "")).filter(el => el != ""));
        }
        if (line.startsWith("#program_type ")) {
            const type = line.split("#program_type ")[1];
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
export function addSourcesToCode(code, sourceLine = { text: `not provided`, lineNumber: 2 }) {
    return code.map(compiledLine => [compiledLine, sourceLine]);
}
export function exit(message) {
    Log.fatal(message);
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
