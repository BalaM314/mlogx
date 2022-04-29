import { checkCommand, cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType } from "./funcs.js";
import commands from "./commands.js";
import { requiredVarCode } from "./consts.js";
import { CompilerError } from "./classes.js";
export function compileMlogxToMlog(program, settings) {
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
        let error = {};
        for (let command of commandList) {
            let result = checkCommand(command, cleanedLine);
            if (result.replace) {
                outputData.push(...result.replace);
                continue toNextLine;
            }
            else if (result.error) {
                error = result.error;
            }
            else if (result.ok) {
                outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line);
                continue toNextLine;
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
            outputData.push(settings.compilerOptions.removeComments ? cleanedLine : line + " #Error");
        }
    }
    if (settings.compilerOptions.checkTypes) {
        try {
            checkTypes(outputData, settings);
        }
        catch (err) {
            console.error(err);
        }
    }
    return outputData;
}
export function checkTypes(program, settings) {
    let variablesUsed = {};
    let variablesDefined = {};
    toNextLine: for (let line of program) {
        let cleanedLine = cleanLine(line);
        if (cleanedLine.match(/^.*?\:$/i))
            continue toNextLine;
        let args = splitLineIntoArguments(line).slice(1);
        let commandDefinitions = getCommandDefinitions(cleanedLine);
        if (commandDefinitions.length == 0) {
            throw new CompilerError(`Invalid command \`${line}\`.\nType checking aborted.`);
        }
        for (let commandDefinition of commandDefinitions) {
            getVariablesDefined(args, commandDefinition).forEach(([variableName, variableType]) => {
                if (!variablesDefined[variableName])
                    variablesDefined[variableName] = [];
                variablesDefined[variableName].push({
                    variableType,
                    lineDefinedAt: line
                });
            });
        }
        getAllPossibleVariablesUsed(cleanedLine).forEach(([variableName, variableTypes]) => {
            if (!variablesUsed[variableName])
                variablesUsed[variableName] = [];
            variablesUsed[variableName].push({
                variableTypes,
                lineUsedAt: line
            });
        });
    }
    for (let [name, variable] of Object.entries(variablesDefined)) {
        let types = [...new Set(variable.map(el => el.variableType))];
        if (types.length > 1) {
            console.warn(`Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
	First definition: \`${variable[0].lineDefinedAt}\`
	First conflicting definition: \`${variable.filter(v => v.variableType == types[1])[0].lineDefinedAt}\``);
        }
    }
    ;
    for (let [name, variableUsages] of Object.entries(variablesUsed)) {
        if (name == "_")
            continue;
        for (let variableUsage of variableUsages) {
            if (!variablesDefined[name]) {
                console.warn(`Variable "${name}" seems to be undefined.
	at ${variableUsage.lineUsedAt}`);
            }
            else if (!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variablesDefined[name][0].variableType)) {
                console.warn(`Type mismatch: variable "${name}" is of type "${variablesDefined[name][0].variableType}",\
but the command requires it to be of type [${variableUsage.variableTypes.map(t => `"${t}"`).join(", ")}]
	at ${variableUsage.lineUsedAt}
	First definition at: ${variablesDefined[name][0].lineDefinedAt}`);
            }
        }
    }
}
