import { compileLine, compileMlogxToMlog } from "../compile.js";
import { defaultSettings } from "../consts.js";
import { addSourcesToCode, range } from "../funcs.js";
import { allMlogCommands, allMlogxCommands, allShorthandCommands, namespaceTests, startNamespace, testPrograms } from "./samplePrograms.js";
function settingsForFilename(name, checkTypes = false) {
    return {
        ...defaultSettings,
        filename: name,
        compilerOptions: {
            ...defaultSettings.compilerOptions,
            compileWithErrors: false,
            checkTypes,
            removeUnusedJumpLabels: true
        }
    };
}
describe("compileLine", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileLine({ text: line, lineNumber: 1 }, new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileLine({ text: line, lineNumber: 1 }, new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileLine({ text: input, lineNumber: 1 }, new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])).toEqual([output]);
        }
    });
    it("should detect the start of a namespace", () => {
        expect(compileLine({ text: startNamespace, lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "namespace",
                name: "testname"
            }]);
    });
    it("should detect the end of a namespace", () => {
        expect(compileLine({ text: "}", lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, [{
                type: "namespace",
                name: "testname"
            }]).modifiedStack).toEqual([]);
    });
    it("should prepend namespaces", () => {
        for (const [input, stack, output] of namespaceTests) {
            expect(compileLine({ text: input, lineNumber: 1 }, new Map(), settingsForFilename("sample1.mlogx"), false, stack).compiledCode.map(line => line[0])).toEqual([output]);
        }
    });
    it("should detect the start of an &for in loop", () => {
        expect(compileLine({ text: `&for i in 0 5 {`, lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&for",
                elements: range(0, 5, true),
                variableName: "i",
                loopBuffer: []
            }]);
    });
    it("should detect the start of an &for of loop", () => {
        expect(compileLine({ text: `&for i of c d e {`, lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack).toEqual([{
                type: "&for",
                elements: ["c", "d", "e"],
                variableName: "i",
                loopBuffer: []
            }]);
    });
    it("should detect the end of an &for loop", () => {
        expect(compileLine({ text: "}", lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, [{
                type: "&for",
                elements: range(1, 3, true),
                variableName: "n",
                loopBuffer: addSourcesToCode([`set x 5`, `print "n is $n"`])
            }]).modifiedStack).toEqual([]);
    });
    it("should unroll an &for loop", () => {
        expect(compileLine({ text: "}", lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, [{
                type: "&for",
                elements: ["32", "53", "60"],
                variableName: "n",
                loopBuffer: addSourcesToCode([`set x 5`, `print "n is $n"`])
            }]).compiledCode.map(line => line[0])).toEqual([`set x 5`, `print "n is 32"`, `set x 5`, `print "n is 53"`, `set x 5`, `print "n is 60"`]);
    });
    it("should unroll nested &for loops", () => {
        let stack = [
            {
                type: "&for",
                elements: range(1, 3, true),
                variableName: "I",
                loopBuffer: addSourcesToCode([`loop_$I:`])
            },
            {
                type: "&for",
                elements: range(5, 6, true),
                variableName: "J",
                loopBuffer: addSourcesToCode([`set x 5`, `print "j is $J"`])
            }
        ];
        const compiledOutput = compileLine({ text: "}", lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, stack);
        stack = compiledOutput.modifiedStack ?? stack;
        stack.at(-1)?.loopBuffer.push(...compiledOutput.compiledCode);
        expect(compiledOutput.compiledCode.map(line => line[0]))
            .toEqual([`set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`]);
        expect(compiledOutput.modifiedStack).toEqual([{
                type: "&for",
                elements: range(1, 3, true),
                variableName: "I",
                loopBuffer: addSourcesToCode([`loop_$I:`, `set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`])
            }]);
        const secondOutput = compileLine({ text: "}", lineNumber: 1 }, new Map(), settingsForFilename("sample.mlogx"), false, stack);
        expect(secondOutput.compiledCode.map(line => line[0]))
            .toEqual([
            `loop_1:`, `set x 5`, `print "j is 5"`, `set x 5`,
            `print "j is 6"`, `loop_2:`, `set x 5`, `print "j is 5"`,
            `set x 5`, `print "j is 6"`, `loop_3:`, `set x 5`,
            `print "j is 5"`, `set x 5`, `print "j is 6"`
        ]);
        expect(secondOutput.modifiedStack).toEqual([]);
    });
});
describe("compileMlogxToMlog", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileMlogxToMlog([line], settingsForFilename("sample1.mlogx"), new Map())).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], settingsForFilename("sample2.mlogx"), new Map())).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileMlogxToMlog([input], settingsForFilename("sample3.mlogx"), new Map())).toEqual([output]);
        }
    });
});
describe("compilation", () => {
    for (const [name, program] of Object.entries(testPrograms)) {
        it(`should compile ${name} with expected output`, () => {
            expect(compileMlogxToMlog(program.program, settingsForFilename("sample3.mlogx"), program.compilerConsts)).toEqual(program.expectedOutput);
        });
    }
});
