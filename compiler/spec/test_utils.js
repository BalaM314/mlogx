import { compilerCommands } from "../src/commands.js";
import { addSourcesToCode } from "../src/funcs.js";
export function makeNamespaceEl(name) {
    return { type: "namespace", commandDefinition: compilerCommands["namespace"].overloads[0], name, line: { lineNumber: 1, text: `namespace ${name} {`, sourceFilename: "[test]" } };
}
export function makeForEl(varname, elements, loopBuffer = []) {
    return { type: "&for", commandDefinition: compilerCommands["&for"].overloads[elements.filter(el => !isNaN(parseInt(el))).length == elements.length ? 0 : 1], variableName: varname, elements, loopBuffer: addSourcesToCode(loopBuffer), line: { lineNumber: 420, text: "[test]", sourceFilename: "[test]" } };
}
export function makeIfEl(enabled) {
    return { type: "&if", commandDefinition: compilerCommands["&if"].overloads[0], line: { lineNumber: 420, text: "[test]", sourceFilename: "[test]" }, enabled };
}
export function commandErrOfType(type) {
    return {
        type,
        message: jasmine.any(String)
    };
}
export function makeLine(text, lineNumber = 1, sourceFilename = "[test]") {
    return {
        text, lineNumber, sourceFilename
    };
}
export const anyLine = {
    lineNumber: jasmine.any(Number),
    text: jasmine.any(String),
    sourceFilename: jasmine.any(String)
};
