import { GenericArgType, CommandErrorType } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants, getJumpLabelUsed, isArgOfType, typeofArg, getLabel, addNamespaces, addNamespacesToLine, inForLoop, inNamespace, topForLoop, prependFilenameToArg, getCommandDefinition, } from "./funcs.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError } from "./classes.js";
export function compileMlogxToMlog(program, settings, compilerConstants) {
    let [programType, requiredVars, author] = parsePreprocessorDirectives(program);
    let isMain = programType == "main" || settings.compilerOptions.mode == "single";
    let outputData = [];
    let stack = [];
    for (let requiredVar of requiredVars) {
        if (requiredVarCode[requiredVar])
            outputData.push(...requiredVarCode[requiredVar]);
        else
            console.warn("Unknown require " + requiredVar, settings);
    }
    for (let line in program) {
        try {
            let compiledOutput = compileLine(program[line], compilerConstants, settings, +line, isMain, stack);
            if (inForLoop(stack)) {
                topForLoop(stack).loopBuffer.push(...compiledOutput);
            }
            else {
                outputData.push(...compiledOutput);
            }
        }
        catch (err) {
            if (err instanceof CompilerError) {
                console.error(`Error: ${err.message}
	at ${settings.filename}:${+line + 1} \`${program[line]}\``);
            }
            else {
                throw err;
            }
        }
    }
    if (stack.length !== 0) {
        console.error(`Error: Some blocks were not closed.`, settings);
        console.error(stack);
    }
    return outputData;
}
export function compileLine(line, compilerConstants, settings, lineNumber, isMain, stack) {
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
    cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
    if (getLabel(cleanedLine)) {
        return inNamespace(stack) ? [`${addNamespaces(getLabel(cleanedLine), stack)}:`] : [settings.compilerOptions.removeComments ? cleanedLine : line];
    }
    let args = splitLineIntoArguments(cleanedLine)
        .map(arg => prependFilenameToArg(arg, isMain, settings.filename));
    if (args[0] == "namespace") {
        let name = args[1];
        if (!(name?.length > 0)) {
            throw new CompilerError("No name specified for namespace");
        }
        stack.push({
            name,
            type: "namespace"
        });
        return [];
    }
    if (args[0] == "&for") {
        const variableName = args[1];
        const lowerBound = parseInt(args[2]);
        const upperBound = parseInt(args[3]);
        if (isNaN(lowerBound))
            throw new CompilerError(`Invalid for loop syntax: lowerBound(${lowerBound}) is invalid`);
        if (isNaN(upperBound))
            throw new CompilerError(`Invalid for loop syntax: upperBound(${upperBound}) is invalid`);
        if (lowerBound < 0)
            throw new CompilerError(`Invalid for loop syntax: lowerBound(${upperBound}) cannot be negative`);
        if ((upperBound - lowerBound) > 200)
            throw new CompilerError(`Invalid for loop syntax: number of loops(${upperBound - lowerBound}) is greater than 200`);
        stack.push({
            type: "&for",
            lowerBound,
            upperBound,
            variableName,
            loopBuffer: []
        });
        return [];
    }
    if (args[0] == "}") {
        if (stack.length == 0) {
            throw new CompilerError("No block to end");
        }
        else {
            const endedBlock = stack.pop();
            if (endedBlock?.type == "&for") {
                let output = [];
                for (let i = endedBlock.lowerBound; i <= endedBlock.upperBound; i++) {
                    output.push(...endedBlock.loopBuffer.map(line => replaceCompilerConstants(line, {
                        [endedBlock.variableName]: i.toString()
                    })));
                }
                return output;
            }
            else if (endedBlock?.type == "namespace") {
            }
        }
        return [];
    }
    let [commandList, errors] = getCommandDefinitions(cleanedLine, true);
    if (commandList.length == 0) {
        if (errors.length == 0) {
            throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line}"\nPlease copy this and file an issue on Github.`);
        }
        if (errors.length == 1) {
            throw new CompilerError(errors[0].message);
        }
        else {
            const typeErrors = errors.filter(error => error.type == CommandErrorType.type);
            if (typeErrors.length != 0) {
                throw new CompilerError(typeErrors[0].message + `\nErrors for other overloads not displayed.`);
            }
            else {
                throw new CompilerError(`Line did not match any overloads for command ${args[0]}`);
            }
        }
    }
    return getOutputForCommand(args, commandList[0], stack);
}
export function checkTypes(compiledProgram, settings, uncompiledProgram) {
    let variablesUsed = {};
    let variablesDefined = {
        ...processorVariables,
        ...(uncompiledProgram ? getParameters(uncompiledProgram).reduce((accumulator, [name, type]) => {
            accumulator[name] ??= [];
            accumulator[name].push({ variableType: type, line: {
                    text: "[function parameter]",
                    lineNumber: 1
                } });
            return accumulator;
        }, {}) : {})
    };
    let jumpLabelsUsed = {};
    let jumpLabelsDefined = {};
    toNextLine: for (let lineNumber in compiledProgram) {
        const line = compiledProgram[lineNumber];
        let cleanedLine = cleanLine(line);
        if (cleanedLine == "")
            continue toNextLine;
        let labelName = getLabel(cleanedLine);
        if (labelName) {
            jumpLabelsDefined[labelName] ??= [];
            jumpLabelsDefined[labelName].push({
                line: {
                    text: line,
                    lineNumber: +lineNumber + 1
                }
            });
            continue toNextLine;
        }
        let args = splitLineIntoArguments(line).slice(1);
        let commandDefinitions = getCommandDefinitions(cleanedLine);
        if (commandDefinitions.length == 0) {
            throw new CompilerError(`Type checking aborted because the program contains invalid commands.`);
        }
        let jumpLabelUsed = getJumpLabelUsed(cleanedLine);
        if (jumpLabelUsed) {
            jumpLabelsUsed[jumpLabelUsed] ??= [];
            jumpLabelsUsed[jumpLabelUsed].push({
                line: {
                    text: line,
                    lineNumber: +lineNumber + 1
                }
            });
        }
        for (let commandDefinition of commandDefinitions) {
            getVariablesDefined(args, commandDefinition).forEach(([variableName, variableType]) => {
                variablesDefined[variableName] ??= [];
                variablesDefined[variableName].push({
                    variableType,
                    line: {
                        text: line,
                        lineNumber: +lineNumber + 1
                    }
                });
            });
        }
        getAllPossibleVariablesUsed(cleanedLine).forEach(([variableName, variableTypes]) => {
            variablesUsed[variableName] ??= [];
            variablesUsed[variableName].push({
                variableTypes,
                line: {
                    text: line,
                    lineNumber: +lineNumber + 1
                }
            });
        });
    }
    for (let [name, variable] of Object.entries(variablesDefined)) {
        let types = [
            ...new Set(variable.map(el => el.variableType))
        ].filter(el => el != GenericArgType.valid && el != GenericArgType.any &&
            el != GenericArgType.variable && el != GenericArgType.valid &&
            el != GenericArgType.null).map(el => el == "boolean" ? "number" : el);
        if (types.length > 1) {
            console.warn(`Warning: Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
First definition:
	at ${settings.filename}:${variable[0].line.lineNumber} \`${variable[0].line.text}\`
First conflicting definition:
	at ${settings.filename}:${variable.filter(v => v.variableType == types[1])[0].line.lineNumber} \`${variable.filter(v => v.variableType == types[1])[0].line.text}\``);
        }
    }
    ;
    for (let [name, variableUsages] of Object.entries(variablesUsed)) {
        if (name == "_")
            continue;
        for (let variableUsage of variableUsages) {
            if (!variablesDefined[name]) {
                console.warn(`Warning: Variable "${name}" seems to be undefined.
	at ${settings.filename}:${variableUsage.line.lineNumber} \`${variableUsage.line.text}\``);
            }
            else if (!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variablesDefined[name][0].variableType)) {
                console.warn(`Warning: variable "${name}" is of type "${variablesDefined[name][0].variableType}",\
but the command requires it to be of type [${variableUsage.variableTypes.map(t => `"${t}"`).join(", ")}]
	at ${settings.filename}:${variableUsage.line.lineNumber} \`${variableUsage.line.text}\`
	First definition at: ${settings.filename}:${variablesDefined[name][0].line.lineNumber} \`${variablesDefined[name][0].line.text}\``);
            }
        }
    }
    for (let [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)) {
        if (definitions.length > 1) {
            console.warn(`Warning: Jump label ${jumpLabel} was defined ${definitions.length} times.`);
            definitions.forEach(definition => console.warn(`	at ${settings.filename}:${definition.line.lineNumber} \`${definition.line.text}\``));
        }
    }
    for (let [jumpLabel, usages] of Object.entries(jumpLabelsUsed)) {
        if (!jumpLabelsDefined[jumpLabel]) {
            console.warn(`Warning: Jump label ${jumpLabel} is missing.`);
            usages.forEach(usage => console.warn(`${settings.filename}:${usage.line.lineNumber} \`${usage.line.text}\``));
        }
    }
}
export function getOutputForCommand(args, command, stack) {
    if (command.replace) {
        const compiledCommand = command.replace(args);
        return compiledCommand.map(line => {
            const compiledCommandDefinition = getCommandDefinition(line);
            if (!compiledCommandDefinition)
                throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
            return addNamespacesToLine(splitLineIntoArguments(line), compiledCommandDefinition, stack);
        });
    }
    return [addNamespacesToLine(args, command, stack)];
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
