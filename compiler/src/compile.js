import deepmerge from "deepmerge";
import { CompilerError, Statement } from "./classes.js";
import { maxLines, processorVariables, requiredVarCode } from "./consts.js";
import { addNamespacesToLine, addSourcesToCode, cleanLine, formatLineWithPrefix, getAllPossibleVariablesUsed, getCommandDefinition, getCommandDefinitions, getCompilerCommandDefinitions, getJumpLabelsDefined, getJumpLabelsUsed, splitLineOnSemicolons, getParameters, getVariablesDefined, impossible, isInputAcceptedByAnyType, parsePreprocessorDirectives, prependFilenameToArg, removeUnusedJumps, replaceCompilerConstants, splitLineIntoArguments, transformCommand } from "./funcs.js";
import { Log } from "./Log.js";
import { hasElement } from "./stack_elements.js";
import { CommandErrorType } from "./types.js";
export function compileMlogxToMlog(mlogxProgram, state, typeDefinitions = {
    jumpLabelsDefined: {},
    jumpLabelsUsed: {},
    variableDefinitions: {},
    variableUsages: {},
}) {
    const [programType, requiredVars] = parsePreprocessorDirectives(mlogxProgram);
    const isMain = programType == "main" || state.compilerOptions.mode == "single";
    const cleanedProgram = cleanProgram(mlogxProgram, state);
    const compiledProgram = [];
    let stack = [];
    let typeCheckingData = deepmerge(typeDefinitions, {
        variableDefinitions: {
            ...processorVariables,
            ...(mlogxProgram ? getParameters(mlogxProgram).reduce((accumulator, [name, type]) => {
                accumulator[name] ??= [];
                accumulator[name].push({ variableType: type, line: {
                        text: "[function parameter]",
                        lineNumber: 1,
                        sourceFilename: "[function parameter]"
                    } });
                return accumulator;
            }, {}) : {})
        }
    });
    for (const requiredVar of requiredVars) {
        if (requiredVarCode[requiredVar]) {
            compiledProgram.push(...requiredVarCode[requiredVar][0].map(line => Statement.fromLines(line, {
                text: `[#require'd variable]`,
                lineNumber: 0,
                sourceFilename: "[#require'd variable]",
            }, {
                text: `[#require'd variable]`,
                lineNumber: 0,
                sourceFilename: "[#require'd variable]",
            })));
            typeCheckingData.variableDefinitions[requiredVar] = [{
                    variableType: requiredVarCode[requiredVar][1],
                    line: {
                        text: `[#require'd variable]`,
                        lineNumber: 0,
                        sourceFilename: "[#require'd variable]",
                    }
                }];
        }
        else {
            Log.printMessage("unknown require", { requiredVar });
        }
    }
    let hasInvalidStatements = false;
    for (const [cleanedLine, sourceLine] of cleanedProgram) {
        try {
            let modifiedLine = cleanedLine;
            for (const def of stack.map(el => el.commandDefinition).reverse()) {
                if (def.onprecompile) {
                    const outputData = def.onprecompile({ line: modifiedLine, stack, state });
                    if ("skipCompilation" in outputData)
                        continue;
                    modifiedLine = outputData.output;
                }
            }
            const { compiledCode, modifiedStack, skipTypeChecks, typeCheckingData: outputTypeCheckingData } = compileLine([modifiedLine, sourceLine], state, isMain, stack);
            if (modifiedStack)
                stack = modifiedStack;
            let doTypeChecks = !skipTypeChecks;
            let modifiedCode = compiledCode;
            for (const def of stack.map(el => el.commandDefinition).reverse()) {
                if (def.onpostcompile) {
                    const { modifiedOutput, skipTypeChecks } = def.onpostcompile({ compiledOutput: compiledCode, state, stack });
                    if (skipTypeChecks)
                        doTypeChecks = false;
                    modifiedCode = modifiedOutput;
                    if (modifiedOutput.length == 0)
                        break;
                }
            }
            if (doTypeChecks) {
                try {
                    for (const compiledLine of compiledCode) {
                        typeCheckStatement(compiledLine, typeCheckingData);
                    }
                }
                catch (err) {
                    if (err instanceof CompilerError) {
                        Log.err(`${err.message}
${formatLineWithPrefix(sourceLine)}`);
                        hasInvalidStatements = true;
                    }
                    else {
                        throw err;
                    }
                }
            }
            compiledProgram.push(...modifiedCode);
            if (outputTypeCheckingData)
                typeCheckingData = deepmerge(typeCheckingData, outputTypeCheckingData);
        }
        catch (err) {
            if (err instanceof CompilerError) {
                Log.err(`${err.message}
${formatLineWithPrefix(sourceLine)}`);
            }
            else {
                throw err;
            }
        }
    }
    if (stack.length !== 0) {
        for (const element of stack) {
            Log.err(`${element.type == "namespace" ? `Namespace "${element.name}"` : element.type == "&for" ? `For loop with variable "${element.variableName}"` : `&if statement`} was not closed.
${formatLineWithPrefix(element.line)}`);
        }
        CompilerError.throw("unclosed blocks", {});
    }
    if (state.compilerOptions.checkTypes && !hasInvalidStatements)
        printTypeErrors(typeCheckingData);
    const outputProgram = state.compilerOptions.removeUnusedJumpLabels ?
        removeUnusedJumps(compiledProgram, typeCheckingData.jumpLabelsUsed) :
        compiledProgram;
    if (outputProgram.length > maxLines) {
        Log.printMessage("program too long", {});
    }
    return { outputProgram, typeCheckingData };
}
export function typeCheckStatement(statement, typeCheckingData) {
    if (cleanLine(statement.text) == "")
        Log.warn("mlogx generated a blank line. This should not happen.");
    for (const labelName of getJumpLabelsDefined(statement.args, statement.commandDefinitions[0])) {
        typeCheckingData.jumpLabelsDefined[labelName] ??= [];
        typeCheckingData.jumpLabelsDefined[labelName].push({
            line: statement.sourceLine()
        });
        return;
    }
    if (statement.commandDefinitions.length == 0) {
        CompilerError.throw("type checking invalid commands", {});
    }
    if (statement.modifiedSource.commandDefinitions.length == 0) {
        Log.printMessage("invalid uncompiled command definition", { statement });
    }
    for (const jumpLabelUsed of getJumpLabelsUsed(statement.args, statement.commandDefinitions[0])) {
        typeCheckingData.jumpLabelsUsed[jumpLabelUsed] ??= [];
        typeCheckingData.jumpLabelsUsed[jumpLabelUsed].push({
            line: statement.cleanedSourceLine()
        });
    }
    for (const commandDefinition of statement.commandDefinitions) {
        getVariablesDefined(statement, commandDefinition).forEach(([variableName, variableType]) => {
            typeCheckingData.variableDefinitions[variableName] ??= [];
            typeCheckingData.variableDefinitions[variableName].push({
                variableType,
                line: statement.cleanedSourceLine()
            });
        });
    }
    getAllPossibleVariablesUsed(statement).forEach(([variableName, variableTypes]) => {
        typeCheckingData.variableUsages[variableName] ??= [];
        typeCheckingData.variableUsages[variableName].push({
            variableTypes,
            line: statement.cleanedSourceLine()
        });
    });
    return;
}
export function printTypeErrors({ variableDefinitions, variableUsages, jumpLabelsDefined, jumpLabelsUsed }) {
    for (const [name, definitions] of Object.entries(variableDefinitions)) {
        const types = [
            ...new Set(definitions.map(el => el.variableType)
                .filter(el => el != "any" && el != "variable" &&
                el != "null").map(el => el == "boolean" ? "number" : el))
        ];
        if (types.length > 1) {
            Log.printMessage("variable redefined with conflicting type", {
                name, types, firstDefinitionLine: definitions.filter(d => d.variableType == types[0])[0].line, conflictingDefinitionLine: definitions.filter(v => v.variableType == types[1])[0].line
            });
        }
    }
    for (const [name, thisVariableUsages] of Object.entries(variableUsages)) {
        if (name == "_")
            continue;
        for (const variableUsage of thisVariableUsages) {
            if (!(name in variableDefinitions)) {
                Log.printMessage("variable undefined", {
                    name, line: variableUsage.line
                });
            }
            else if (!isInputAcceptedByAnyType(variableDefinitions[name][0].variableType, variableUsage.variableTypes)) {
                Log.warn(`Variable "${name}" is of type "${variableDefinitions[name][0].variableType}", \
but the command requires it to be of type ${variableUsage.variableTypes.map(t => `"${t}"`).join(" or ")}
${formatLineWithPrefix(variableUsage.line)}
	First definition:
${formatLineWithPrefix(variableDefinitions[name][0].line, "\t\t")}`);
            }
        }
    }
    for (const [jumpLabel, definitions] of Object.entries(jumpLabelsDefined)) {
        if (definitions.length > 1) {
            Log.printMessage("jump label redefined", { jumpLabel, numDefinitions: definitions.length });
            definitions.forEach(definition => Log.none(formatLineWithPrefix(definition.line)));
        }
    }
    for (const [jumpLabel, usages] of Object.entries(jumpLabelsUsed)) {
        if (!jumpLabelsDefined[jumpLabel] && isNaN(parseInt(jumpLabel))) {
            Log.printMessage("jump label missing", { jumpLabel });
            usages.forEach(usage => Log.none(formatLineWithPrefix(usage.line)));
        }
    }
}
export function cleanProgram(program, state) {
    const outputProgram = [];
    for (const line in program) {
        const sourceLine = {
            lineNumber: +line + 1,
            text: program[line],
            sourceFilename: state.project.filename
        };
        const cleanedText = cleanLine(sourceLine.text);
        if (cleanedText != "")
            outputProgram.push(...splitLineOnSemicolons(cleanedText).map(l => [{
                    text: l,
                    lineNumber: sourceLine.lineNumber,
                    sourceFilename: state.project.filename
                }, sourceLine]));
    }
    return outputProgram;
}
export function compileLine([cleanedLine, sourceLine], state, isMain, stack) {
    cleanedLine.text = replaceCompilerConstants(cleanedLine.text, state.compilerConstants, hasElement(stack, '&for'));
    const cleanedText = cleanedLine.text;
    const args = splitLineIntoArguments(cleanedText)
        .map(arg => prependFilenameToArg(arg, isMain, state.project.filename));
    if (args[0] == "}") {
        const modifiedStack = stack.slice();
        const removedElement = modifiedStack.pop();
        if (!removedElement) {
            CompilerError.throw("no block to end", {});
        }
        if (removedElement.commandDefinition.onend) {
            return {
                ...removedElement.commandDefinition.onend({ line: cleanedLine, removedElement, state, stack }),
                modifiedStack
            };
        }
        else {
            return {
                compiledCode: [],
                modifiedStack
            };
        }
    }
    const [commandList, errors] = (args[0].startsWith("&") || args[0] == "namespace" ? getCompilerCommandDefinitions : getCommandDefinitions)(cleanedText, true);
    if (commandList.length == 0) {
        if (errors.length == 0) {
            throw new Error(`An error message was not generated. This is an error with MLOGX.\nDebug information: "${sourceLine.text}"\nPlease copy this and file an issue on Github.`);
        }
        if (errors.length == 1) {
            throw new CompilerError(errors[0].message);
        }
        else {
            if (state.verbose) {
                CompilerError.throw("line matched no overloads", { commandName: args[0], errors });
            }
            else {
                const typeErrors = errors.filter(error => error.type == CommandErrorType.type);
                const highPriorityErrors = errors.filter(error => !error.lowPriority);
                if (typeErrors.length == 1) {
                    throw new CompilerError(typeErrors[0].message + `\nErrors for other overloads not displayed.`);
                }
                else if (highPriorityErrors.length == 1) {
                    throw new CompilerError(errors[0].message);
                }
                else {
                    CompilerError.throw("line matched no overloads", { commandName: args[0] });
                }
            }
        }
    }
    if (commandList[0].type == "CompilerCommand") {
        if (commandList[0].onbegin) {
            const { compiledCode, element, skipTypeChecks } = commandList[0].onbegin({ line: cleanedLine, stack, state });
            return {
                compiledCode,
                modifiedStack: element ? stack.concat(element) : undefined,
                skipTypeChecks
            };
        }
        else {
            return {
                compiledCode: []
            };
        }
    }
    return {
        compiledCode: addSourcesToCode(getOutputForCommand(args, commandList[0], stack), cleanedLine, cleanedLine, sourceLine)
    };
}
export function getOutputForCommand(args, command, stack) {
    if (command.replace) {
        const compiledCommand = command.replace(args);
        return compiledCommand.map(line => {
            const compiledCommandDefinition = getCommandDefinition(line);
            if (!compiledCommandDefinition) {
                Log.dump({ args, command, compiledCommand, line, compiledCommandDefinition });
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
    cleanedCode.forEach(line => {
        const commandDefinition = getCommandDefinition(line);
        if (!commandDefinition)
            Log.printMessage("line invalid", { line });
        else if (getJumpLabelsDefined(splitLineIntoArguments(line), commandDefinition).length > 0)
            CompilerError.throw("genLabels contains label", { line });
    });
    for (const line of cleanedCode) {
        const args = splitLineIntoArguments(line);
        const commandDefinition = getCommandDefinition(line);
        if (!commandDefinition)
            continue;
        for (const label of getJumpLabelsUsed(args, commandDefinition)) {
            if (label == "0") {
                jumps[label] = "0";
            }
            else if (!isNaN(parseInt(label)) && !jumps[label]) {
                jumps[label] = `jump_${lastJumpNameIndex}_`;
                lastJumpNameIndex += 1;
            }
        }
    }
    for (const line of cleanedCode) {
        const args = splitLineIntoArguments(line);
        const commandDefinition = getCommandDefinition(line);
        if (commandDefinition) {
            const labels = getJumpLabelsUsed(args, commandDefinition);
            if (labels.length > 0) {
                transformedCode.push(transformCommand(args, commandDefinition, (arg) => jumps[arg] ?? (isNaN(parseInt(arg)) ? arg : impossible()), (arg, carg) => carg.isGeneric && carg.type == "jumpAddress").join(" "));
            }
            else {
                transformedCode.push(line);
            }
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
export function portCode(program, mode) {
    return program.map((line, index) => {
        const cleanedLine = {
            text: cleanLine(line),
            lineNumber: index + 1,
            sourceFilename: "unknown.mlogx"
        };
        const leadingTabsOrSpaces = line.match(/^[ \t]*/) ?? "";
        const comment = line.match(/#.*$/) ?? "";
        let commandDefinition = getCommandDefinition(cleanedLine.text);
        const args = splitLineIntoArguments(cleanedLine.text);
        while (commandDefinition == null && args.at(-1) == "0") {
            args.splice(-1, 1);
            cleanedLine.text = args.join(" ");
            commandDefinition = getCommandDefinition(cleanedLine.text);
        }
        if (commandDefinition == null) {
            Log.printMessage("cannot port invalid line", { line: cleanedLine });
        }
        else if (commandDefinition.port) {
            return leadingTabsOrSpaces + commandDefinition.port(args, mode) + comment;
        }
        return leadingTabsOrSpaces + args.join(" ") + comment;
    });
}
