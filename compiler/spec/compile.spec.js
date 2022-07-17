import { compileLine, compileMlogxToMlog } from "../compile.js";
import { defaultSettings } from "../consts.js";
import { allMlogCommands, allMlogxCommands, allShorthandCommands, namespaceTests, startNamespace } from "./samplePrograms.js";
function settingsForFilename(name, checkTypes = false) {
    return {
        ...defaultSettings,
        filename: name,
        compilerOptions: {
            ...defaultSettings.compilerOptions,
            compileWithErrors: false,
            checkTypes
        }
    };
}
describe("compileLine", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileLine(line, {}, settingsForFilename("sample1.mlogx"), 1, false, []).compiledCode).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileLine(line, {}, settingsForFilename("sample1.mlogx"), 1, false, []).compiledCode).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileLine(input, {}, settingsForFilename("sample1.mlogx"), 1, false, []).compiledCode).toEqual([output]);
        }
    });
    it("should detect the start of a namespace", () => {
        expect(compileLine(startNamespace, {}, settingsForFilename("sample.mlogx"), 1, false, []).modifiedStack).toEqual([{
                type: "namespace",
                name: "testname"
            }]);
    });
    it("should detect the end of a namespace", () => {
        expect(compileLine("}", {}, settingsForFilename("sample.mlogx"), 1, false, [{
                type: "namespace",
                name: "testname"
            }]).modifiedStack).toEqual([]);
    });
    it("should prepend namespaces", () => {
        for (const [input, stack, output] of namespaceTests) {
            expect(compileLine(input, {}, settingsForFilename("sample1.mlogx"), 1, false, stack).compiledCode).toEqual([output]);
        }
    });
    it("should detect the start of an &for loop", () => {
        expect(compileLine(startNamespace, {}, settingsForFilename("sample.mlogx"), 1, false, []).modifiedStack).toEqual([{
                type: "namespace",
                name: "testname"
            }]);
    });
    it("should detect the end of an &for loop", () => {
        expect(compileLine("}", {}, settingsForFilename("sample.mlogx"), 1, false, [{
                type: "&for",
                lowerBound: 1,
                upperBound: 3,
                variableName: "n",
                loopBuffer: [`set x 5`, `print "n is $n"`]
            }]).modifiedStack).toEqual([]);
    });
    it("should unroll an &for loop", () => {
        expect(compileLine("}", {}, settingsForFilename("sample.mlogx"), 1, false, [{
                type: "&for",
                lowerBound: 1,
                upperBound: 3,
                variableName: "n",
                loopBuffer: [`set x 5`, `print "n is $n"`]
            }]).compiledCode).toEqual([`set x 5`, `print "n is 1"`, `set x 5`, `print "n is 2"`, `set x 5`, `print "n is 3"`]);
    });
    it("should unroll nested &for loops", () => {
        let stack = [
            {
                type: "&for",
                lowerBound: 1,
                upperBound: 3,
                variableName: "I",
                loopBuffer: [`loop_$I`]
            },
            {
                type: "&for",
                lowerBound: 5,
                upperBound: 6,
                variableName: "J",
                loopBuffer: [`set x 5`, `print "j is $J"`]
            }
        ];
        const compiledOutput = compileLine("}", {}, settingsForFilename("sample.mlogx"), 1, false, stack);
        stack = compiledOutput.modifiedStack ?? stack;
        stack.at(-1)?.loopBuffer.push(...compiledOutput.compiledCode);
        expect(compiledOutput.compiledCode)
            .toEqual([`set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`]);
        expect(compiledOutput.modifiedStack).toEqual([{
                type: "&for",
                lowerBound: 1,
                upperBound: 3,
                variableName: "I",
                loopBuffer: [`loop_$I`, `set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`]
            }]);
        const secondOutput = compileLine("}", {}, settingsForFilename("sample.mlogx"), 1, false, stack);
        expect(secondOutput.compiledCode)
            .toEqual([
            `loop_1`, `set x 5`, `print "j is 5"`, `set x 5`,
            `print "j is 6"`, `loop_2`, `set x 5`, `print "j is 5"`,
            `set x 5`, `print "j is 6"`, `loop_3`, `set x 5`,
            `print "j is 5"`, `set x 5`, `print "j is 6"`
        ]);
        expect(secondOutput.modifiedStack).toEqual([]);
    });
});
describe("compileMlogxToMlog", () => {
    it("should not change any mlog commands", () => {
        for (const line of allMlogCommands) {
            expect(compileMlogxToMlog([line], settingsForFilename("sample1.mlogx"), {})).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (const line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], settingsForFilename("sample2.mlogx"), {})).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (const [input, output] of allShorthandCommands) {
            expect(compileMlogxToMlog([input], settingsForFilename("sample3.mlogx"), {})).toEqual([output]);
        }
    });
});
