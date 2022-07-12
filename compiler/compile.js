import { GenericArgType, CommandErrorType } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants, getJumpLabelUsed, isArgOfType, typeofArg, getLabel, err, addNamespaces, addNamespacesToLine, inForLoop, inNamespace, topForLoop, prependFilenameToArg, } from "./funcs.js";
import commands from "./commands.js";
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
            err("Unknown require " + requiredVar, settings);
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
            throw err;
        }
    }
    if (stack.length !== 0) {
        err(`Some blocks were not closed.`, settings);
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
            err("No name specified for namespace", settings);
            return [];
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
            err("No block to end", settings);
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
    let commandList = commands[args[0]];
    if (!commandList) {
        err(`Unknown command ${args[0]}\nat \`${line}\``, settings);
        return [];
    }
    let errors = [];
    for (let command of commandList) {
        let result = checkCommand(command, cleanedLine);
        if (result.replace) {
            return result.replace.map((line) => addNamespacesToLine(splitLineIntoArguments(line), getCommandDefinitions(line)[0], stack));
        }
        else if (result.error) {
            errors.push(result.error);
        }
        else if (result.ok) {
            return [addNamespacesToLine(args, command, stack)];
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
        let labelName = getLabel(cleanedLine);
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
        let types = [
            ...new Set(variable.map(el => el.variableType))
        ].filter(el => el != GenericArgType.valid && el != GenericArgType.any &&
            el != GenericArgType.variable && el != GenericArgType.valid &&
            el != GenericArgType.null).map(el => el == "boolean" ? "number" : el);
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
