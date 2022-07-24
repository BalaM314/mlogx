import { GAT, CommandErrorType } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants, getJumpLabelUsed, getLabel, addNamespaces, addNamespacesToLine, inForLoop, inNamespace, topForLoop, prependFilenameToArg, getCommandDefinition, formatLineWithPrefix, removeUnusedJumps, } from "./funcs.js";
import { processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError, Log } from "./classes.js";
export function compileMlogxToMlog(mlogxProgram, settings, compilerConstants) {
    const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);
    const isMain = programType == "main" || settings.compilerOptions.mode == "single";
    const compiledProgram = [];
    let stack = [];
    let typeCheckingData = {
        jumpLabelsDefined: {},
        jumpLabelsUsed: {},
        variableDefinitions: {
            ...processorVariables,
            ...(mlogxProgram ? getParameters(mlogxProgram).reduce((accumulator, [name, type]) => {
                accumulator[name] ??= [];
                accumulator[name].push({ variableType: type, line: {
                        text: "[function parameter]",
                        lineNumber: 1
                    } });
                return accumulator;
            }, {}) : {})
        },
        variableUsages: {}
    };
    for (const requiredVar of requiredVars) {
        if (requiredVarCode[requiredVar])
            compiledProgram.push(...requiredVarCode[requiredVar]);
        else
            Log.warn("Unknown require " + requiredVar);
    }
    let hasInvalidStatements = false;
    for (const line in mlogxProgram) {
        const sourceLine = {
            lineNumber: +line + 1,
            text: mlogxProgram[line]
        };
        try {
            const { compiledCode, modifiedStack, skipTypeChecks } = compileLine(mlogxProgram[line], compilerConstants, settings, +line, isMain, stack);
            if (modifiedStack)
                stack = modifiedStack;
            if (!hasInvalidStatements && !skipTypeChecks && !inForLoop(stack)) {
                try {
                    for (const compiledLine of compiledCode) {
                        typeCheckLine(compiledLine, sourceLine, typeCheckingData);
                    }
                }
                catch (err) {
                    if (err instanceof CompilerError) {
                        Log.err(`${err.message}
${formatLineWithPrefix(sourceLine, settings)}`);
                        hasInvalidStatements = true;
                    }
                    else {
                        throw err;
                    }
                }
            }
            if (inForLoop(stack)) {
                topForLoop(stack)?.loopBuffer.push(...(compiledCode.map(compiledLine => [compiledLine, sourceLine])));
            }
            else {
                compiledProgram.push(...compiledCode);
            }
        }
        catch (err) {
            if (err instanceof CompilerError) {
                Log.err(`${err.message}
${formatLineWithPrefix({
                    lineNumber: +line + 1, text: mlogxProgram[line]
                }, settings)}`);
            }
            else {
                throw err;
            }
        }
    }
    if (stack.length !== 0) {
        Log.err(`Some blocks were not closed.`);
        Log.dump(stack);
    }
    if (settings.compilerOptions.checkTypes && !hasInvalidStatements)
        printTypeErrors(typeCheckingData, settings);
    if (settings.compilerOptions.removeUnusedJumpLabels)
        return removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed);
    else
        return compiledProgram;
}
export function typeCheckLine(compiledCode, uncompiledLine, typeCheckingData) {
    const cleanedCompiledLine = cleanLine(compiledCode);
    const cleanedUncompiledLine = cleanLine(uncompiledLine.text);
    if (cleanedCompiledLine == "")
        return;
    const labelName = getLabel(cleanedCompiledLine);
    if (labelName) {
        typeCheckingData.jumpLabelsDefined[labelName] ??= [];
        typeCheckingData.jumpLabelsDefined[labelName].push({
            line: uncompiledLine
        });
        return;
    }
    const compiledCommandArgs = splitLineIntoArguments(cleanedCompiledLine).slice(1);
    const compiledCommandDefinitions = getCommandDefinitions(cleanedCompiledLine);
    const uncompiledCommandArgs = splitLineIntoArguments(cleanedUncompiledLine).slice(1);
    const uncompiledCommandDefinitions = getCommandDefinitions(cleanedUncompiledLine);
    if (compiledCommandDefinitions.length == 0) {
        throw new CompilerError(`Type checking aborted because the program contains invalid commands.`);
    }
    if (uncompiledCommandDefinitions.length == 0) {
        Log.warn("Tried to type check a line with an invalid uncompiled command definition. This has most likely occured as the result of a bodge. This may cause issues with type checking.");
    }
    const jumpLabelUsed = getJumpLabelUsed(cleanedCompiledLine);
    if (jumpLabelUsed) {
        typeCheckingData.jumpLabelsUsed[jumpLabelUsed] ??= [];
        typeCheckingData.jumpLabelsUsed[jumpLabelUsed].push({
            line: uncompiledLine
        });
    }
    for (const commandDefinition of compiledCommandDefinitions) {
        getVariablesDefined(compiledCommandArgs, commandDefinition, uncompiledCommandArgs, uncompiledCommandDefinitions[0]).forEach(([variableName, variableType]) => {
            typeCheckingData.variableDefinitions[variableName] ??= [];
            typeCheckingData.variableDefinitions[variableName].push({
                variableType,
                line: uncompiledLine
            });
        });
    }
    getAllPossibleVariablesUsed(cleanedCompiledLine, uncompiledLine.text).forEach(([variableName, variableTypes]) => {
        typeCheckingData.variableUsages[variableName] ??= [];
        typeCheckingData.variableUsages[variableName].push({
            variableTypes,
            line: uncompiledLine
        });
    });
    return;
}
export function printTypeErrors({ variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed }, settings) {
    for (const [name, definitions] of Object.entries(variableDefinitions)) {
        const types = [
            ...new Set(definitions.map(el => el.variableType))
        ].filter(el => el != GAT.valid && el != GAT.any &&
            el != GAT.variable && el != GAT.valid &&
            el != GAT.null).map(el => el == "boolean" ? "number" : el);
        if (types.length > 1) {
            Log.warn(`Variable "${name}" was defined with ${types.length} different types. ([${types.join(", ")}])
	First definition:
${formatLineWithPrefix(definitions[0].line, settings, "\t\t")}
	First conflicting definition:
${formatLineWithPrefix(definitions.filter(v => v.variableType == types[1])[0].line, settings, "\t\t")}`);
        }
    }
    for (const [name, thisVariableUsages] of Object.entries(variableUsages)) {
        if (name == "_")
            continue;
        for (const variableUsage of thisVariableUsages) {
            if (!(name in variableDefinitions)) {
                Log.warn(`Variable "${name}" seems to be undefined.
${formatLineWithPrefix(variableUsage.line, settings)}`);
            }
            else if (!areAnyOfInputsCompatibleWithType(variableUsage.variableTypes, variableDefinitions[name][0].variableType)) {
                Log.warn(`Variable "${name}" is of type "${variableDefinitions[name][0].variableType}", \
but the command requires it to be of type ${variableUsage.variableTypes.map(t => `"${t}"`).join(" or ")}
${formatLineWithPrefix(variableUsage.line, settings)}
	First definition: 
${formatLineWithPrefix(variableDefinitions[name][0].line, settings, "\t\t")}`);
            }
        }
    }
    for (const [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)) {
        if (definitions.length > 1) {
            Log.warn(`Jump label "${jumpLabel}" was defined ${definitions.length} times.`);
            definitions.forEach(definition => Log.none(formatLineWithPrefix(definition.line, settings)));
        }
    }
    for (const [jumpLabel, usages] of Object.entries(jumpLabelsUsed)) {
        if (!jumpLabelsDefined[jumpLabel]) {
            Log.warn(`Jump label "${jumpLabel}" is missing.`);
            usages.forEach(usage => Log.none(formatLineWithPrefix(usage.line, settings)));
        }
    }
}
export function compileLine(line, compilerConstants, settings, lineNumber, isMain, stack) {
    if (line.includes("\u{F4321}")) {
        Log.warn(`Line \`${line}\` includes the character \\uF4321 which may cause issues with argument parsing`);
    }
    let cleanedLine = cleanLine(line);
    if (cleanedLine == "") {
        if (settings.compilerOptions.removeComments) {
            return {
                compiledCode: []
            };
        }
        else {
            return {
                compiledCode: [line]
            };
        }
    }
    cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
    if (getLabel(cleanedLine)) {
        return {
            compiledCode: inNamespace(stack) ?
                [`${addNamespaces(getLabel(cleanedLine), stack)}:`] :
                [settings.compilerOptions.removeComments ? cleanedLine : line]
        };
    }
    const args = splitLineIntoArguments(cleanedLine)
        .map(arg => prependFilenameToArg(arg, isMain, settings.filename));
    if (args[0] == "namespace") {
        const name = args[1];
        if (!(name?.length > 0)) {
            throw new CompilerError("No name specified for namespace");
        }
        return {
            modifiedStack: stack.concat({
                name,
                type: "namespace"
            }),
            compiledCode: []
        };
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
        return {
            modifiedStack: stack.concat({
                type: "&for",
                lowerBound,
                upperBound,
                variableName,
                loopBuffer: []
            }),
            compiledCode: []
        };
    }
    if (args[0] == "}") {
        if (stack.length == 0) {
            throw new CompilerError("No block to end");
        }
        else {
            const modifiedStack = stack.slice();
            const endedBlock = modifiedStack.pop();
            if (endedBlock?.type == "&for") {
                const compiledCode = [];
                for (let i = endedBlock.lowerBound; i <= endedBlock.upperBound; i++) {
                    compiledCode.push(...endedBlock.loopBuffer.map(line => replaceCompilerConstants(line[0], {
                        [endedBlock.variableName]: i.toString()
                    })));
                }
                return {
                    compiledCode,
                    modifiedStack
                };
            }
            else if (endedBlock?.type == "namespace") {
            }
            return {
                modifiedStack,
                compiledCode: []
            };
        }
    }
    const [commandList, errors] = getCommandDefinitions(cleanedLine, true);
    if (commandList.length == 0) {
        if (errors.length == 0) {
            throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line}"\nPlease copy this and file an issue on Github.`);
        }
        if (errors.length == 1) {
            throw new CompilerError(errors[0].message);
        }
        else {
            const typeErrors = errors.filter(error => error.type == CommandErrorType.type);
            if (settings.compilerOptions.verbose) {
                throw new CompilerError(`Line did not match any overloads for command ${args[0]}:\n` + errors.map(err => "\t" + err.message).join("\n"));
            }
            else {
                if (typeErrors.length != 0) {
                    throw new CompilerError(typeErrors[0].message + `\nErrors for other overloads not displayed.`);
                }
                else {
                    throw new CompilerError(`Line did not match any overloads for command ${args[0]}`);
                }
            }
        }
    }
    return {
        compiledCode: getOutputForCommand(args, commandList[0], stack)
    };
}
export function getOutputForCommand(args, command, stack) {
    if (command.replace) {
        const compiledCommand = command.replace(args);
        return compiledCommand.map(line => {
            const compiledCommandDefinition = getCommandDefinition(line);
            if (!compiledCommandDefinition) {
                Log.dump({ args, command, compiledCommand, compiledCommandDefinition });
                throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
            }
            return addNamespacesToLine(splitLineIntoArguments(line), compiledCommandDefinition, stack);
        });
    }
    return [addNamespacesToLine(args, command, stack)];
}
