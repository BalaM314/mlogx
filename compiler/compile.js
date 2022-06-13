import { GenericArgType, CommandErrorType } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerVariables, getJumpLabelUsed, isArgOfType, typeofArg, getLabel, err, addNamespaces, addNamespacesToLine } from "./funcs.js";
import commands from "./commands.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError } from "./classes.js";
export function compileMlogxToMlog(program, settings, compilerVariables) {
    let [programType, requiredVars, author] = parsePreprocessorDirectives(program);
    let isMain = programType == "main" || settings.compilerOptions.mode == "single";
    let outputData = [];
    let namespaceStack = [];
    for (let requiredVar of requiredVars) {
        if (requiredVarCode[requiredVar])
            outputData.push(...requiredVarCode[requiredVar]);
        else
            err("Unknown require " + requiredVar, settings);
    }
    for (let line of program) {
        try {
            outputData.push(...compileLine(line, compilerVariables, settings, isMain, namespaceStack));
        }
        catch (err) {
            throw err;
        }
    }
    return outputData;
}
export function compileLine(line, compilerVariables, settings, isMain, namespaceStack) {
    line = replaceCompilerVariables(line, compilerVariables);
    if (line.includes("\u{F4321}")) {
        console.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
    }
    let cleanedLine = cleanLine(line);
    if (cleanedLine == "") {
        if (settings.compilerOptions.removeComments) {
            return [];
        }
        else {
            return [line];
        }
    }
    if (getLabel(cleanedLine)) {
        return namespaceStack.length ? [`${addNamespaces(getLabel(cleanedLine), namespaceStack)}:`] : [settings.compilerOptions.removeComments ? cleanedLine : line];
    }
    let args = splitLineIntoArguments(cleanedLine)
        .map(arg => arg.startsWith("__") ? `${isMain ? "" : settings.filename.replace(/\.mlogx?/gi, "")}${arg}` : arg);
    if (args[0] == "namespace") {
        let name = args[1];
        if (!(name?.length > 0)) {
            err("No name specified for namespace", settings);
            return [];
        }
        namespaceStack.push(name);
        return [];
    }
    if (args[0] == "}") {
        if (namespaceStack.length == 0) {
            err("No namespace to end", settings);
        }
        else {
            namespaceStack.pop();
        }
        return [];
    }
    let commandList = commands[args[0]];
    if (!commandList) {
        err(`Unknown command ${args[0]}\nat \`${line}\``, settings);
        return [];
    }
    let errors = [];
    for (let command of commandList) {
        let result = checkCommand(command, cleanedLine);
        if (result.replace) {
            return result.replace.map((line) => addNamespacesToLine(splitLineIntoArguments(line), getCommandDefinitions(line)[0], namespaceStack));
        }
        else if (result.error) {
            errors.push(result.error);
        }
        else if (result.ok) {
            return [addNamespacesToLine(args, command, namespaceStack)];
        }
    }
    if (commandList.length == 1) {
        err(errors[0].message, settings);
    }
    else {
        err(`Line
\`${cleanedLine}\`
did not match any overloads for command ${args[0]}`, settings);
    }
    if (!commandList[0].replace) {
        return [settings.compilerOptions.removeComments ? cleanedLine : line + " #Error"];
    }
    else {
        return [];
    }
}
export function checkTypes(compiledProgram, settings, uncompiledProgram) {
    let variablesUsed = {};
    let variablesDefined = {
        ...processorVariables,
        ...(uncompiledProgram ? getParameters(uncompiledProgram).reduce((accumulator, [name, type]) => {
            accumulator[name] ??= [];
            accumulator[name].push({ variableType: type, line: "[function parameter]" });
            return accumulator;
        }, {}) : {})
    };
    let jumpLabelsUsed = {};
    let jumpLabelsDefined = {};
    toNextLine: for (let line of compiledProgram) {
        let cleanedLine = cleanLine(line);
        if (cleanedLine == "")
            continue toNextLine;
        let labelName = cleanedLine.match(/^.+?(?=\:$)/i)?.[0];
        if (labelName) {
            jumpLabelsDefined[labelName] ??= [];
            jumpLabelsDefined[labelName].push({
                line: line
            });
            continue toNextLine;
        }
        let args = splitLineIntoArguments(line).slice(1);
        let commandDefinitions = getCommandDefinitions(cleanedLine);
        if (commandDefinitions.length == 0) {
            throw new CompilerError(`Type checking aborted because the program contains invalid commands.
	at \`${line}\``);
        }
        let jumpLabelUsed = getJumpLabelUsed(cleanedLine);
        if (jumpLabelUsed) {
            jumpLabelsUsed[jumpLabelUsed] ??= [];
            jumpLabelsUsed[jumpLabelUsed].push({
                line: cleanedLine
            });
        }
        for (let commandDefinition of commandDefinitions) {
            getVariablesDefined(args, commandDefinition).forEach(([variableName, variableType]) => {
                variablesDefined[variableName] ??= [];
                variablesDefined[variableName].push({
                    variableType,
                    line: line
                });
            });
        }
        getAllPossibleVariablesUsed(cleanedLine).forEach(([variableName, variableTypes]) => {
            variablesUsed[variableName] ??= [];
            variablesUsed[variableName].push({
                variableTypes,
                line: line
            });
        });
    }
    for (let [name, variable] of Object.entries(variablesDefined)) {
        let types = [...new Set(variable.map(el => el.variableType))].filter(el => el != GenericArgType.valid && el != GenericArgType.any && el != GenericArgType.variable && el != GenericArgType.valid);
        if (types.length > 1) {
            console.warn(`Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
	First definition: \`${variable[0].line}\`
	First conflicting definition: \`${variable.filter(v => v.variableType == types[1])[0].line}\``);
        }
    }
    ;
    for (let [name, variableUsages] of Object.entries(variablesUsed)) {
        if (name == "_")
            continue;
        for (let variableUsage of variableUsages) {
            if (!variablesDefined[name]) {
                console.warn(`Variable "${name}" seems to be undefined.
	at ${variableUsage.line}`);
            }
            else if (!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variablesDefined[name][0].variableType)) {
                console.warn(`Type mismatch: variable "${name}" is of type "${variablesDefined[name][0].variableType}",\
but the command requires it to be of type [${variableUsage.variableTypes.map(t => `"${t}"`).join(", ")}]
	at ${variableUsage.line}
	First definition at: ${variablesDefined[name][0].line}`);
            }
        }
    }
    for (let [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)) {
        if (definitions.length > 1) {
            console.warn(`Jump label ${jumpLabel} was defined ${definitions.length} times.`);
        }
    }
    for (let [jumpLabel, definitions] of Object.entries(jumpLabelsUsed)) {
        if (!jumpLabelsDefined[jumpLabel]) {
            console.warn(`Jump label ${jumpLabel} is missing.
	at ${definitions[0].line}`);
        }
    }
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
    if (command.replace) {
        return {
            ok: true,
            replace: command.replace(args),
        };
    }
    return {
        ok: true
    };
}
