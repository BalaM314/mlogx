import { compilerCommands } from "../src/commands.js";
import { CommandErrorType } from "../src/types.js";
export function makeNamespaceEl(name) {
    return { type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: { lineNumber: 1, text: `namespace ${name} {`, sourceFilename: "[test]" } };
}
export function makeForEl(varname, elements, loopBuffer = [], sourceLine) {
    const isNumbers = elements.filter(el => isNaN(parseInt(el))).length == 0;
    return {
        type: "&for",
        commandDefinition: compilerCommands["&for"].overloads[isNumbers ? 0 : 1],
        variableName: varname,
        elements,
        loopBuffer: loopBuffer.map(line => makeLine(line)),
        line: sourceLine ?? { lineNumber: 1, text: isNumbers ? `&for ${varname} in ${elements.map(el => parseInt(el)).sort((a, b) => a - b)[0]} ${elements.map(el => parseInt(el)).sort((a, b) => a - b).at(-1)} {` : `&for ${varname} of ${elements.join(" ")} {`, sourceFilename: "[test]" }
    };
}
export function makeIfEl(enabled) {
    return { type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: { lineNumber: 420, text: "[test]", sourceFilename: "[test]" }, enabled };
}
export function commandErrOfType(type) {
    return {
        type: CommandErrorType[type],
        message: jasmine.any(String)
    };
}
export function makeLine(text, lineNumber = 1, sourceFilename = "[test]") {
    return {
        text, lineNumber, sourceFilename
    };
}
export function makeCompileLineInput(text, sourceText) {
    return [makeLine(text), sourceText ? makeLine(sourceText) : makeLine(text)];
}
export const anyLine = {
    lineNumber: jasmine.any(Number),
    text: jasmine.any(String),
    sourceFilename: jasmine.any(String)
};
export const blankLine = {
    text: "[test]",
    lineNumber: 1,
    sourceFilename: "[test]"
};
