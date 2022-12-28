import chalk from "chalk";
import * as readline from "readline";
import { GenericArgs, isTokenValidForType, isTokenValidForGAT, isGenericArg, guessTokenType } from "./args.js";
import { CompilerError, Statement } from "./classes.js";
import { commands, compilerCommands } from "./commands.js";
import { bugReportUrl } from "./consts.js";
import { Log } from "./Log.js";
import { hasElement } from "./stack_elements.js";
import { CommandErrorType } from "./types.js";
export function cleanLine(line) {
    return removeTrailingSpaces(removeComments(line));
}
export function removeTrailingSpaces(line) {
    return line
        .replace(/(^[ \t]+)|([ \t]+$)/g, "");
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
export function replaceCompilerConstants(line, variables, ignoreUnknownCompilerConsts = false) {
    const specifiedConsts = line.match(/(?<!\\\$\()(?<=\$\()[^()]+(?=\))/g);
    specifiedConsts?.forEach(key => {
        if (variables.has(key)) {
            const value = variables.get(key);
            line = line.replace(`$(${key})`, value instanceof Array ? value.join(" ") : value.toString());
        }
        else {
            if (!ignoreUnknownCompilerConsts) {
                Log.printMessage("unknown compiler const", { name: key });
            }
        }
    });
    if (!line.includes("$"))
        return line;
    for (const [key, value] of Array.from(variables).slice().sort((a, b) => b.length - a.length)) {
        line = line.replaceAll(`$${key}`, value instanceof Array ? value.join(" ") : value.toString());
    }
    return line;
}
export function splitLineIntoTokens(cleanedLine) {
    if (cleanedLine.includes(`"`)) {
        const tokens = [""];
        let isInString = false;
        for (const char of cleanedLine) {
            if (char == `"`) {
                isInString = !isInString;
            }
            if (!isInString && char == " ") {
                tokens.push("");
            }
            else {
                tokens[tokens.length - 1] += char;
            }
        }
        if (isInString)
            CompilerError.throw("unterminated string literal", { line: cleanedLine });
        return tokens;
    }
    else {
        return cleanedLine.split(" ");
    }
}
export function splitLineOnSemicolons(cleanedLine) {
    if (cleanedLine.includes(`"`)) {
        const lines = [""];
        let isInString = false;
        for (const char of cleanedLine) {
            if (char == `"`) {
                isInString = !isInString;
            }
            if (isInString) {
                lines[0] += char;
            }
            else if (char == ";") {
                lines.push("");
            }
            else {
                lines[0] += char;
            }
        }
        if (isInString)
            CompilerError.throw("unterminated string literal", { line: cleanedLine });
        return lines.map(cleanLine).filter(cleanedLine => cleanedLine != "");
    }
    else {
        return cleanedLine.split(";").map(cleanLine).filter(cleanedLine => cleanedLine != "");
    }
}
export function transformVariables(tokens, commandDefinition, transformFunction) {
    return transformCommand(tokens, commandDefinition, transformFunction, (token, arg) => (arg?.isVariable || (acceptsVariable(arg)
        && isTokenValidForGAT(token, "variable"))) && token !== "_");
}
export function transformCommand(tokens, commandDefinition, transformFunction, filterFunction = () => true) {
    return tokens
        .map((arg, index) => [arg, commandDefinition.args[index - 1]])
        .map(([arg, commandArg]) => (commandArg && filterFunction(arg, commandArg))
        ? transformFunction(arg, commandArg) : arg);
}
export function addNamespacesToVariable(variable, stack) {
    return `_${stack.filter(el => el.type == "namespace").map(el => el.name).join("_")}_${variable}`;
}
export function addNamespacesToLine(tokens, commandDefinition, stack) {
    if (!hasElement(stack, "namespace"))
        return tokens.join(" ");
    return transformVariables(tokens, commandDefinition, (variable) => addNamespacesToVariable(variable, stack)).join(" ");
}
export function prependFilenameToToken(token, isMain, filename) {
    return token.startsWith("__") ? `__${isMain ? "" : filename.replace(/\.mlogx?/gi, "")}${token}` : token;
}
export function removeUnusedJumps(compiledProgram, jumpLabelUsages) {
    return compiledProgram.filter(line => {
        const labels = getJumpLabelsDefined(line.tokens, line.commandDefinitions[0]);
        if (labels.length == 0)
            return true;
        return labels.some(label => label in jumpLabelUsages);
    });
}
export function interpolateString(input) {
    const chunks = [{
            type: "string",
            content: ""
        }];
    const chars = input.split("");
    while (chars[0]) {
        const char = chars.shift();
        const chunk = chunks.at(-1);
        if (char == "{" || char == "}") {
            if (chunk.content.at(-1) == "\\") {
                chunk.content = chunk.content.slice(0, -1);
            }
            else {
                const type = char == "{" ? "variable" : "string";
                if (type != chunk.type) {
                    chunks.push({
                        type,
                        content: ""
                    });
                    continue;
                }
            }
        }
        chunks.at(-1).content += char;
    }
    return chunks.filter(chunk => chunk.content.length > 0);
}
export function parseIcons(data) {
    const icons = new Map();
    for (const line of data) {
        if (!line || line.length <= 1)
            continue;
        try {
            icons.set("_" + line.split("=")[1].split("|")[0].replaceAll("-", "_"), String.fromCodePoint(parseInt(line.split("=")[0])));
        }
        catch (err) {
            if (!(err instanceof RangeError)) {
                throw err;
            }
        }
    }
    return icons;
}
export function getParameters(program) {
    const functionLine = program.filter(line => line.startsWith("#function "))[0];
    return functionLine
        ?.match(/(?<=#function .*?\().*?(?=\))/)?.[0]
        ?.split(",")
        .map(arg => removeTrailingSpaces(arg).split(":"))
        .filter(arg => arg.length == 2) ?? [];
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
export function getVariablesDefined(statement, compiledCommandDefinition) {
    if (statement.modifiedSource.commandDefinitions[0].getVariablesDefined) {
        return statement.modifiedSource.commandDefinitions[0].getVariablesDefined(statement.modifiedSource.tokens);
    }
    if (compiledCommandDefinition.getVariablesDefined) {
        return compiledCommandDefinition.getVariablesDefined(statement.tokens);
    }
    return statement.tokens
        .slice(1)
        .map((token, index) => [token, compiledCommandDefinition.args[index]])
        .filter((([token, arg]) => arg && arg.isVariable && token !== "_"))
        .map(([token, arg]) => [token, arg.type]);
}
export function getAllPossibleVariablesUsed(statement) {
    const variablesUsed_s = [];
    for (const commandDefinition of statement.commandDefinitions) {
        variablesUsed_s.push(getVariablesUsed(statement.tokens, commandDefinition));
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
export function getVariablesUsed(tokens, commandDefinition) {
    return tokens
        .slice(commandDefinition.checkFirstTokenAsArg ? 0 : 1)
        .map((token, index) => [token, commandDefinition.args[index]])
        .filter(([token, arg]) => isTokenValidForGAT(token, "variable") && acceptsVariable(arg) && token != "_").map(([token, arg]) => [token, arg.type]);
}
export function getJumpLabelsUsed(tokens, commandDefinition) {
    return tokens
        .slice(commandDefinition.checkFirstTokenAsArg ? 0 : 1)
        .map((token, index) => [token, commandDefinition.args[index]])
        .filter(([, arg]) => arg.type == "jumpAddress").map(([arg]) => arg);
}
export function getJumpLabelsDefined(tokens, commandDefinition) {
    return tokens
        .slice(commandDefinition.checkFirstTokenAsArg ? 0 : 1)
        .map((token, index) => [token, commandDefinition.args[index]])
        .filter(([, arg]) => arg.type == "definedJumpLabel").map(([token]) => token.slice(0, -1));
}
export function areAnyOfInputsAcceptedByType(inputs, type) {
    for (const input of inputs) {
        if (typeIsAccepted(input, type))
            return true;
    }
    return false;
}
export function isInputAcceptedByAnyType(input, types) {
    for (const type of types) {
        if (typeIsAccepted(input, type))
            return true;
    }
    return false;
}
export function typeIsAccepted(input, type) {
    if (isGenericArg(type)) {
        if (input == type)
            return true;
        if (type == "any" || type == "null")
            return true;
        if (input == "any" || input == "null")
            return true;
        const argKey = GenericArgs.get(type);
        if (!argKey)
            impossible();
        return argKey.alsoAccepts.includes(input);
    }
    else
        return input == type;
}
export function acceptsVariable(arg) {
    if (arg == undefined)
        return false;
    if (arg.isVariable)
        return false;
    if (arg.isGeneric) {
        if (!isKey(GenericArgs, arg.type))
            impossible();
        return GenericArgs.get(arg.type).alsoAccepts.includes("variable");
    }
    else {
        return false;
    }
}
export function isCommand(cleanedLine, command) {
    const rawTokens = splitLineIntoTokens(cleanedLine);
    const tokens = command.checkFirstTokenAsArg ? rawTokens : rawTokens.slice(1);
    const maxArgs = command.args.map(arg => arg.spread ? Infinity : 1).reduce((a, b) => a + b, 0);
    const minArgs = command.args.filter(arg => !arg.isOptional).length;
    if (tokens.length > maxArgs || tokens.length < minArgs) {
        return [false, {
                type: CommandErrorType.argumentCount,
                message: `Incorrect number of arguments for command "${command.name}", see \`mlogx info ${command.name}\``,
                lowPriority: command.checkFirstTokenAsArg,
            }];
    }
    let numSpreadArgs = 0;
    for (const argIndex in command.args) {
        const arg = command.args[+argIndex];
        const token = tokens[+argIndex + numSpreadArgs];
        if (arg == undefined) {
            Log.dump({
                rawTokens,
                tokens,
                maxArgs,
                minArgs
            });
            throw new Error(`Too many arguments were present for a command, but this was not properly detected.`);
        }
        if (token == undefined) {
            if (arg.isOptional)
                return [true, null];
            Log.dump({
                rawTokens,
                tokens,
                maxArgs,
                minArgs
            });
            throw new Error(`Not enough arguments were present for a command, but this was not properly detected.`);
        }
        if (arg.spread) {
            if (command.args.slice(+argIndex + 1).filter(arg => arg.spread || arg.isOptional).length > 0) {
                throw new Error(`Command definitions with more than one spread arg or optional args after a spread arg are not yet implemented.`);
            }
            numSpreadArgs = tokens.slice(+argIndex).length - command.args.slice(+argIndex + 1).length - 1;
        }
        if (!isTokenValidForType(token, arg)) {
            if (arg.isGeneric)
                return [false, {
                        type: CommandErrorType.type,
                        message: `Type mismatch: value "${token}" was expected to be of type "${arg.isVariable ? "variable" : arg.type}", but was of type "${guessTokenType(token)}"`,
                        lowPriority: command.checkFirstTokenAsArg,
                    }];
            else
                return [false, {
                        type: CommandErrorType.badStructure,
                        message: `Incorrect argument: value "${token}" was expected to be "${arg.type}", but was "${guessTokenType(token)}"`,
                        lowPriority: command.checkFirstTokenAsArg,
                    }];
        }
    }
    return [true, null];
}
export function getCommandDefinition(cleanedLine) {
    return getCommandDefinitions(cleanedLine)[0];
}
export function getCommandDefinitions(cleanedLine, returnErrors = false) {
    if (cleanedLine == "not provided")
        throw new Error(`invalid line`);
    const tokens = splitLineIntoTokens(cleanedLine);
    const commandList = isKey(commands, tokens[0])
        ? commands[tokens[0]]
        : Object.values(commands).flat().filter(def => def.checkFirstTokenAsArg);
    const possibleCommands = [];
    const errors = [];
    for (const possibleCommand of commandList) {
        const result = isCommand(cleanedLine, possibleCommand);
        if (result[0]) {
            possibleCommands.push(possibleCommand);
        }
        else {
            errors.push(result[1]);
        }
    }
    if (commandList.every(command => command.checkFirstTokenAsArg) && possibleCommands.length == 0) {
        return returnErrors ? [[], [{
                    type: CommandErrorType.noCommand,
                    message: `Command "${tokens[0]}" does not exist.`,
                    lowPriority: false
                }]] : [];
    }
    if (returnErrors)
        return [possibleCommands, errors];
    else
        return possibleCommands;
}
export function getCompilerCommandDefinitions(cleanedLine) {
    const tokens = splitLineIntoTokens(cleanedLine);
    if (!isKey(compilerCommands, tokens[0])) {
        return [[], [{
                    type: CommandErrorType.noCommand,
                    message: `Compiler command "${tokens[0]}" does not exist.`,
                    lowPriority: false
                }]];
    }
    const commandGroup = compilerCommands[tokens[0]];
    const possibleCommands = [];
    const errors = [];
    for (const possibleCommand of commandGroup.overloads) {
        const result = isCommand(cleanedLine, possibleCommand);
        if (result[0]) {
            possibleCommands.push(possibleCommand);
        }
        else {
            errors.push(result[1]);
        }
    }
    return [possibleCommands, errors];
}
export function formatLine(line) {
    return chalk.gray(`${line.sourceFilename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}
export function formatLineWithPrefix(line, prefix = "\t\tat ") {
    return chalk.gray(`${prefix}${line.sourceFilename}:${line.lineNumber}`) + chalk.white(` \`${line.text}\``);
}
export function addSourcesToCode(code, modifiedSourceLine, cleanedSourceLine = modifiedSourceLine, sourceLine = cleanedSourceLine) {
    return code.map(compiledLine => new Statement(compiledLine, sourceLine.text, cleanedSourceLine.text, modifiedSourceLine.text, sourceLine.sourceFilename, sourceLine.lineNumber));
}
export function exit(message) {
    Log.fatal(message);
    process.exit(1);
}
export function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(question, answer => {
        rl.close();
        resolve(answer);
    }));
}
export async function askYesOrNo(question) {
    return ["y", "yes"].includes(await askQuestion(question));
}
export function isObject(thing) {
    return thing != null && typeof thing == "object" && !Array.isArray(thing);
}
export function flattenObject(object, parentName, output = {}) {
    for (const key in object) {
        const name = (parentName ? parentName + "." : "") + key;
        if (isObject(object[key])) {
            flattenObject(object[key], name, output);
        }
        else {
            output[name] = object[key];
        }
    }
    return output;
}
export function range(min, max, strings) {
    if (min > max)
        return [];
    return strings ? [...Array(max + 1 - min).keys()].map(i => (i + min).toString()) : [...Array(max + 1 - min).keys()].map(i => i + min);
}
export function getCompilerConsts(icons, state, projectInfo) {
    const outputMap = new Map();
    for (const [key, value] of icons) {
        outputMap.set(key, value);
    }
    outputMap.set("name", projectInfo.name);
    outputMap.set("authors", projectInfo.authors.join(", "));
    outputMap.set("filename", projectInfo.filename);
    for (const [key, value] of Object.entries(state.compilerConstants)) {
        if (isObject(value)) {
            for (const [k, v] of Object.entries(flattenObject(value))) {
                outputMap.set(key + "." + k, v);
            }
        }
        else if (Array.isArray(value)) {
            for (const [k, v] of value.entries()) {
                outputMap.set(`${key}[${k + 1}]`, v);
            }
            outputMap.set(`${key}.length`, value.length);
            outputMap.set(key, value);
        }
        else {
            outputMap.set(key, value);
        }
    }
    return outputMap;
}
export function getState(settings, directory, options) {
    return {
        project: {
            name: settings.name,
            authors: settings.authors,
            directoryPath: directory
        },
        compilerOptions: {
            ...settings.compilerOptions
        },
        compilerConstants: {
            ...settings.compilerConstants,
        },
        verbose: "verbose" in options.namedArgs
    };
}
export function getLocalState(state, filename, icons) {
    const project = {
        ...state.project,
        filename
    };
    return {
        ...state,
        project,
        compilerConstants: getCompilerConsts(icons, state, project)
    };
}
export function impossible() {
    throw new Error(`Something happened that should not be possible.
If you are reading this, then there's an error with mlogx.
Please file a bug report at ${bugReportUrl}
Make sure to screenshot the stack trace below:`);
}
export function extend() {
    return (data) => data;
}
export function isKey(obj, thing) {
    if (obj instanceof Map)
        return obj.has(thing);
    else
        return thing in obj;
}
export function is(input) {
}
export function concat(input1, input2) {
    return new Map([
        ...input1.entries(),
        ...(input2 instanceof Array ? input2 : input2.entries())
    ]);
}
