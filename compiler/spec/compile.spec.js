import { compileMlogxToMlog } from "../compile.js";
import { defaultSettings } from "../consts.js";
import { allMlogCommands, allMlogxCommands, allShorthandCommands } from "./samplePrograms.js";
function settingsForFilename(name) {
    return {
        ...defaultSettings,
        filename: name,
        compilerOptions: {
            ...defaultSettings.compilerOptions,
            compileWithErrors: false
        }
    };
}
describe("Compilation", () => {
    it("should not change any mlog commands", () => {
        for (let line of allMlogCommands) {
            expect(compileMlogxToMlog([line], settingsForFilename("sample1.mlogx"), {})).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (let line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], settingsForFilename("sample2.mlogx"), {})).not.toThrow();
        }
    });
    it("should process all shorthands", () => {
        for (let line of allShorthandCommands) {
            expect(compileMlogxToMlog([line[0]], settingsForFilename("sample3.mlogx"), {})).toEqual([line[1]]);
        }
    });
});
