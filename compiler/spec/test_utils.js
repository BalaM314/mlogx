export function makeNamespaceEl(name) {
    return { type: "namespace", name, line: { lineNumber: 420, text: "[test]" } };
}
export function makeForEl(varname, elements, loopBuffer = []) {
    return { type: "&for", variableName: varname, elements, loopBuffer, line: { lineNumber: 420, text: "[test]" } };
}
