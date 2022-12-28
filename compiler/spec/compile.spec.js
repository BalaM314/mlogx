import { compilerCommands } from "../src/commands.js";
import { addJumpLabels, compileLine, compileMlogxToMlog } from "../src/compile.js";
import { range } from "../src/funcs.js";
import { Log } from "../src/Log.js";
import { addLabelsTests, allMlogCommands, allMlogxCommands, allShorthandCommands, namespaceTests, startNamespace, testPrograms } from "./samplePrograms.js";
import { makeForEl, makeIfEl, makeLine, makeNamespaceEl, anyLine, makeCompileLineInput, stateForFilename } from "./test_utils.js";
describe("compileLine", () => {
    beforeAll(() => {
        Log.throwWarnAndErr = true;
    });
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileLine(makeCompileLineInput(line), stateForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line.text)).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileLine(makeCompileLineInput(line), stateForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line.text)).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileLine(makeCompileLineInput(input), stateForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line.text)).toEqual([output]);
        }
    });
    it("should detect the start of a namespace", () => {
        expect(compileLine(makeCompileLineInput(startNamespace), stateForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([makeNamespaceEl("testname")]);
    });
    it("should detect the end of a namespace", () => {
        expect(compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, [makeNamespaceEl("testname")]).modifiedStack).toEqual([]);
    });
    it("should prepend namespaces", () => {
        for (const [input, stack, output] of namespaceTests) {
            expect(compileLine(makeCompileLineInput(input), stateForFilename("sample1.mlogx"), false, stack).compiledCode.map(line => line.text)).toEqual([output]);
        }
    });
    it("should detect the start of an &for in loop", () => {
        expect(compileLine(makeCompileLineInput(`&for i in 0 5 {`), stateForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&for",
                commandDefinition: compilerCommands["&for"].overloads[0],
                elements: range(0, 5, true),
                variableName: "i",
                loopBuffer: [],
                line: anyLine
            }]);
    });
    it("should detect the start of an &for of loop", () => {
        expect(compileLine(makeCompileLineInput(`&for i of c d e {`), stateForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([
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
        expect(compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, [
            makeForEl("n", range(1, 3, true), [[`set x 5`, `set x 5`], [`print "n is $n"`, `print "n is $n"`]])
        ]).modifiedStack).toEqual([]);
    });
    it("should unroll an &for loop", () => {
        expect(compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, [
            makeForEl("n", ["32", "53", "60"], [[`set x 5`, `set x 5`], [`print "n is $n"`, `print "n is $n"`]])
        ]).compiledCode.map(line => line.text)).toEqual([`set x 5`, `print "n is 32"`, `set x 5`, `print "n is 53"`, `set x 5`, `print "n is 60"`]);
    });
    it("should unroll nested &for loops", () => {
        let stack = [
            makeForEl("I", range(1, 3, true), [[`loop_$I:`, `loop_$I:`]], makeLine("[test]", 1, "unknown")),
            makeForEl("J", range(5, 6, true), [[`set x 5`, `set x 5`], [`print "j is $J"`, `print "j is $J"`]], makeLine("[test]", 1, "unknown"))
        ];
        const compiledOutput = compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, stack);
        stack = compiledOutput.modifiedStack ?? stack;
        stack.at(-1)?.loopBuffer.push(...compiledOutput.compiledCode);
        expect(compiledOutput.compiledCode.map(line => line.text))
            .toEqual([`set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`]);
        const secondOutput = compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, stack);
        expect(secondOutput.compiledCode.map(line => line.text))
            .toEqual([
            `loop_1:`, `set x 5`, `print "j is 5"`, `set x 5`,
            `print "j is 6"`, `loop_2:`, `set x 5`, `print "j is 5"`,
            `set x 5`, `print "j is 6"`, `loop_3:`, `set x 5`,
            `print "j is 5"`, `set x 5`, `print "j is 6"`
        ]);
        expect(secondOutput.modifiedStack).toEqual([]);
    });
    it("should detect the start of an &if block", () => {
        expect(compileLine(makeCompileLineInput(`&if false {`), stateForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&if",
                commandDefinition: compilerCommands["&if"].overloads[0],
                line: anyLine,
                enabled: false
            }]);
    });
    it("should detect the end of an &if block", () => {
        expect(compileLine(makeCompileLineInput("}"), stateForFilename("sample.mlogx"), false, [makeIfEl(true)]).modifiedStack).toEqual([]);
    });
});
describe("compileMlogxToMlog", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileMlogxToMlog([line], stateForFilename("sample1.mlogx")).outputProgram.map(line => line.text)).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], stateForFilename("sample2.mlogx")).outputProgram.map(line => line.text)).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileMlogxToMlog([input], stateForFilename("sample3.mlogx")).outputProgram.map(line => line.text)).toEqual([output]);
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
            expect(compileMlogxToMlog(program.program, stateForFilename("sample3.mlogx", program.compilerConsts))
                .outputProgram.map(line => line.text)).toEqual(program.expectedOutput);
        });
    }
});
