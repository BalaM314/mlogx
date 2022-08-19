import { addSourcesToCode } from "../src/funcs.js";
export function makeNamespaceEl(name) {
    return { type: "namespace", name, line: { lineNumber: 1, text: `namespace ${name} {` } };
}
export function makeForEl(varname, elements, loopBuffer = []) {
    return { type: "&for", variableName: varname, elements, loopBuffer: addSourcesToCode(loopBuffer), line: { lineNumber: 420, text: "[test]" } };
}
export function makeIfEl() {
    return { type: "&if", line: { lineNumber: 420, text: "[test]" } };
}
