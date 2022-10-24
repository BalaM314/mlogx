import { compilerCommands } from "../src/commands.js";
import { addJumpLabels, compileLine, compileMlogxToMlog } from "../src/compile.js";
import { range } from "../src/funcs.js";
import { Log } from "../src/Log.js";
import { settingsSchema } from "../src/settings.js";
import { addLabelsTests, allMlogCommands, allMlogxCommands, allShorthandCommands, namespaceTests, startNamespace, testPrograms } from "./samplePrograms.js";
import { makeForEl, makeIfEl, makeCompileLineInput, makeNamespaceEl, anyLine } from "./test_utils.js";
Log.throwWarnAndErr = true;
function settingsForFilename(name, checkTypes = false) {
    return settingsSchema.validateSync({
        filename: name,
        compilerOptions: {
            compileWithErrors: false,
            checkTypes,
            removeUnusedJumpLabels: true
        }
    });
}
describe("compileLine", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileLine(makeCompileLineInput(line), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileLine(makeCompileLineInput(line), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileLine(makeCompileLineInput(input), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).toEqual([output]);
        }
    });
    it("should detect the start of a namespace", () => {
        expect(compileLine(makeCompileLineInput(startNamespace), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([makeNamespaceEl("testname")]);
    });
    it("should detect the end of a namespace", () => {
        expect(compileLine(makeCompileLineInput("}"), new Map(), settingsForFilename("sample.mlogx"), false, [makeNamespaceEl("testname")]).modifiedStack).toEqual([]);
    });
    it("should prepend namespaces", () => {
        for (const [input, stack, output] of namespaceTests) {
            expect(compileLine(makeCompileLineInput(input), new Map(), settingsForFilename("sample1.mlogx"), false, stack).compiledCode.map(line => line[0])).toEqual([output]);
        }
    });
    it("should detect the start of an &for in loop", () => {
        expect(compileLine(makeCompileLineInput(`&for i in 0 5 {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&for",
                commandDefinition: compilerCommands["&for"].overloads[0],
                elements: range(0, 5, true),
                variableName: "i",
                loopBuffer: [],
                line: anyLine
            }]);
    });
    it("should detect the start of an &for of loop", () => {
        expect(compileLine(makeCompileLineInput(`&for i of c d e {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([
            {
                type: "&for",
                commandDefinition: compilerCommands["&for"].overloads[1],
                elements: ["c", "d", "e"],
                variableName: "i",
                loopBuffer: [],
                line: anyLine
            }
        ]);
    });
    it("should detect the end of an &for loop", () => {
        expect(compileLine(makeCompileLineInput("}"), new Map(), settingsForFilename("sample.mlogx"), false, [
            makeForEl("n", range(1, 3, true), [`set x 5`, `print "n is $n"`])
        ]).modifiedStack).toEqual([]);
    });
    it("should unroll an &for loop", () => {
        expect(compileLine(makeCompileLineInput("}"), new Map(), settingsForFilename("sample.mlogx"), false, [
            makeForEl("n", ["32", "53", "60"], [`set x 5`, `print "n is $n"`])
        ]).compiledCode.map(line => line[0])).toEqual([`set x 5`, `print "n is 32"`, `set x 5`, `print "n is 53"`, `set x 5`, `print "n is 60"`]);
    });
    it("should unroll nested &for loops", () => {
    });
    it("should detect the start of an &if block", () => {
        expect(compileLine(makeCompileLineInput(`&if false {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&if",
                commandDefinition: compilerCommands["&if"].overloads[0],
                line: anyLine,
                enabled: false
            }]);
    });
    it("should detect the end of an &if block", () => {
        expect(compileLine(makeCompileLineInput("}"), new Map(), settingsForFilename("sample.mlogx"), false, [makeIfEl(true)]).modifiedStack).toEqual([]);
    });
});
describe("compileMlogxToMlog", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileMlogxToMlog([line], settingsForFilename("sample1.mlogx"), new Map()).outputProgram.map(line => line[0])).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], settingsForFilename("sample2.mlogx"), new Map()).outputProgram.map(line => line[0])).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileMlogxToMlog([input], settingsForFilename("sample3.mlogx"), new Map()).outputProgram.map(line => line[0])).toEqual([output]);
        }
    });
});
describe("addJumpLabels", () => {
    for (const program of Object.values(addLabelsTests)) {
        it(program.message, () => {
            expect(addJumpLabels(program.source)).toEqual(program.expectedOutput);
        });
    }
});
describe("compilation", () => {
    for (const [name, program] of Object.entries(testPrograms)) {
        it(`should compile ${name} with expected output`, () => {
            expect(compileMlogxToMlog(program.program, settingsForFilename("sample3.mlogx"), program.compilerConsts)
                .outputProgram.map(line => line[0])).toEqual(program.expectedOutput);
        });
    }
});
