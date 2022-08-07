import { GAT, CommandErrorType } from "./types.js";
import { cleanLine, getAllPossibleVariablesUsed, getCommandDefinitions, getVariablesDefined, parsePreprocessorDirectives, splitLineIntoArguments, areAnyOfInputsCompatibleWithType, getParameters, replaceCompilerConstants, getJumpLabelUsed, getJumpLabel, addNamespacesToVariable, addNamespacesToLine, inForLoop, inNamespace, topForLoop, prependFilenameToArg, getCommandDefinition, formatLineWithPrefix, removeUnusedJumps, addSourcesToCode, transformCommand, range, } from "./funcs.js";
import { maxLines, processorVariables, requiredVarCode } from "./consts.js";
import { CompilerError, Log } from "./classes.js";
import commands from "./commands.js";
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
            const { compiledCode, modifiedStack, skipTypeChecks } = compileLine(sourceLine, compilerConstants, settings, isMain, stack);
            if (modifiedStack)
                stack = modifiedStack;
            if (!hasInvalidStatements && !skipTypeChecks && !inForLoop(stack)) {
                try {
                    for (const compiledLine of compiledCode) {
                        typeCheckLine(compiledLine, typeCheckingData);
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
                topForLoop(stack)?.loopBuffer.push(...compiledCode);
            }
            else {
                compiledProgram.push(...compiledCode.map(line => line[0]));
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
        for (const element of stack) {
            Log.err(`${element.type == "namespace" ? `Namespace "${element.name}"` : `For loop with variable "${element.variableName}"`} was not closed.
${formatLineWithPrefix(element.line, settings)}`);
        }
        throw new CompilerError("There were unclosed blocks.");
    }
    if (settings.compilerOptions.checkTypes && !hasInvalidStatements)
        printTypeErrors(typeCheckingData, settings);
    const outputProgram = settings.compilerOptions.removeUnusedJumpLabels ?
        removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed) :
        compiledProgram;
    if (outputProgram.length > maxLines) {
        Log.err(`Program length exceeded 999 lines. Copy-pasting into an ingame processor will fail.`);
    }
    return outputProgram;
}
export function typeCheckLine(compiledLine, typeCheckingData) {
    const cleanedCompiledLine = cleanLine(compiledLine[0]);
    const cleanedUncompiledLine = cleanLine(compiledLine[1].text);
    if (cleanedCompiledLine == "")
        return;
    const labelName = getJumpLabel(cleanedCompiledLine);
    if (labelName) {
        typeCheckingData.jumpLabelsDefined[labelName] ??= [];
        typeCheckingData.jumpLabelsDefined[labelName].push({
            line: compiledLine[1]
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
            line: compiledLine[1]
        });
    }
    for (const commandDefinition of compiledCommandDefinitions) {
        getVariablesDefined(compiledCommandArgs, commandDefinition, uncompiledCommandArgs, uncompiledCommandDefinitions[0]).forEach(([variableName, variableType]) => {
            typeCheckingData.variableDefinitions[variableName] ??= [];
            typeCheckingData.variableDefinitions[variableName].push({
                variableType,
                line: compiledLine[1]
            });
        });
    }
    getAllPossibleVariablesUsed(cleanedCompiledLine, compiledLine[1].text).forEach(([variableName, variableTypes]) => {
        typeCheckingData.variableUsages[variableName] ??= [];
        typeCheckingData.variableUsages[variableName].push({
            variableTypes,
            line: compiledLine[1]
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
export function compileLine(line, compilerConstants, settings, isMain, stack) {
    if (line.text.includes("\u{F4321}")) {
        Log.warn(`Line \`${line.text}\` includes the character \\uF4321 which may cause issues with argument parsing`);
    }
    let cleanedLine = cleanLine(line.text);
    if (cleanedLine == "") {
        if (settings.compilerOptions.removeComments) {
            return {
                compiledCode: []
            };
        }
        else {
            return {
                compiledCode: [[line.text, line]]
            };
        }
    }
    cleanedLine = replaceCompilerConstants(cleanedLine, compilerConstants);
    if (getJumpLabel(cleanedLine)) {
        return {
            compiledCode: [
                [
                    inNamespace(stack) ?
                        `${addNamespacesToVariable(getJumpLabel(cleanedLine), stack)}:` :
                        settings.compilerOptions.removeComments ? cleanedLine : line.text,
                    line
                ]
            ]
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
                type: "namespace",
                line
            }),
            compiledCode: []
        };
    }
    if (args[0] == "&for") {
        if (args.at(-1) != "{") {
            throw new CompilerError("expected { at and of &for statement");
        }
        const variableName = args[1];
        const type = args[2];
        if (type == "of") {
            return {
                modifiedStack: stack.concat({
                    type: "&for",
                    elements: args.slice(3, -1),
                    variableName,
                    loopBuffer: [],
                    line
                }),
                compiledCode: []
            };
        }
        else if (type == "in") {
            const lowerBound = parseInt(args[3]);
            const upperBound = parseInt(args[4]);
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
                    elements: range(lowerBound, upperBound, true),
                    variableName,
                    loopBuffer: [],
                    line
                }),
                compiledCode: []
            };
        }
        else {
            const lowerBound = parseInt(args[2]);
            const upperBound = parseInt(args[3]);
            Log.warn(`"&for ${variableName} ${lowerBound} ${upperBound}" syntax is deprecated, please use "&for ${variableName} in ${lowerBound} ${upperBound}" instead.`);
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
                    elements: range(lowerBound, upperBound, true),
                    variableName,
                    loopBuffer: [],
                    line
                }),
                compiledCode: []
            };
        }
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
                for (const el of endedBlock.elements) {
                    compiledCode.push(...endedBlock.loopBuffer.map(line => [replaceCompilerConstants(line[0], new Map([[endedBlock.variableName, el]])), {
                            text: replaceCompilerConstants(line[1].text, {
                                ...compilerConstants,
                                [endedBlock.variableName]: el
                            }),
                            lineNumber: line[1].lineNumber
                        }]));
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
            throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${line.text}"\nPlease copy this and file an issue on Github.`);
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
        compiledCode: addSourcesToCode(getOutputForCommand(args, commandList[0], stack), line)
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
