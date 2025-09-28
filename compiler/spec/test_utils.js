import { Statement } from "../src/classes.js";
import { compilerCommands } from "../src/commands.js";
import { getLocalState, getState } from "../src/funcs.js";
import { settingsSchema } from "../src/settings.js";
import { CommandErrorType } from "../src/types.js";
export function makeNamespaceEl(name) {
    return { type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: { lineNumber: 1, text: `namespace ${name} {`, sourceFilename: "[test]" } };
}
export function makeForEl(varname, elements, loopBuffer = [], sourceLine = { lineNumber: 420, text: "[test]", sourceFilename: "[test]" }) {
    const isNumbers = elements.filter(el => isNaN(parseInt(el))).length == 0;
    return {
        type: "&for",
        commandDefinition: compilerCommands["&for"].overloads[isNumbers ? 0 : 1],
        variableName: varname,
        elements,
        loopBuffer: loopBuffer.map(([text, source]) => makeStatement(text, source)),
        line: sourceLine ?? { lineNumber: 1, text: isNumbers ? `&for ${varname} in ${elements.map(el => parseInt(el)).sort((a, b) => a - b)[0]} ${elements.map(el => parseInt(el)).sort((a, b) => a - b).at(-1)} {` : `&for ${varname} of ${elements.join(" ")} {`, sourceFilename: "[test]" }
    };
}
export function makeIfEl(enabled) {
    return { type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: { lineNumber: 420, text: "[test]", sourceFilename: "[test]" }, enabled };
}
export function commandErrOfType(type) {
    return {
        type: CommandErrorType[type],
        message: jasmine.any(String),
        lowPriority: false
    };
}
export function makeStatement(text, source = text, cleanedSource = source, modifiedSource = cleanedSource, lineNumber = 1, sourceFilename = "[test]") {
    return new Statement(text, source, cleanedSource, modifiedSource, sourceFilename, lineNumber);
}
export function makeStatements(lines) {
    return lines.map(line => makeStatement(line));
}
export function makeLine(text, lineNumber = 1, sourceFilename = "[test]") {
    return {
        text, lineNumber, sourceFilename
    };
}
export function makeCompileLineInput(text, lineNumber = 1, sourceFilename = "[test]") {
    return [{
            text, lineNumber, sourceFilename
        }, {
            text, lineNumber, sourceFilename
        }];
}
export function stateForFilename(name, compilerConsts = {}, icons = new Map(), checkTypes = false) {
    return getLocalState(getState(settingsSchema.validateSync({
        compilerOptions: {
            checkTypes
        },
        compilerConstants: compilerConsts
    }), name, {
        namedArgs: {
            verbose: false,
            watch: false,
        }
    }), name, icons);
}
export const anyLine = {
    lineNumber: jasmine.any(Number),
    text: jasmine.any(String),
    sourceFilename: jasmine.any(String)
};
export function errorWith(callback, errorMessage) {
    try {
        return callback();
    }
    catch (err) {
        throw new Error(err.message + "\n" + errorMessage);
    }
}
export function typeCheckingData() {
    return {
        jumpLabelsDefined: {},
        jumpLabelsUsed: {},
        variableDefinitions: {},
        variableUsages: {},
    };
}
