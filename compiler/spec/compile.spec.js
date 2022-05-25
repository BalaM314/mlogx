import { compileMlogxToMlog } from "../compile.js";
import { defaultSettings } from "../consts.js";
import { allMlogCommands, allMlogxCommands } from "./samplePrograms.js";
describe("Compilation", () => {
    it("should not change any mlog commands", () => {
        for (let line of allMlogCommands) {
            expect(compileMlogxToMlog([line], {
                ...defaultSettings,
                filename: "sample1.mlogx",
                compilerOptions: {
                    ...defaultSettings.compilerOptions,
                    compileWithErrors: false
                }
            }, {})).toEqual([line]);
        }
    });
    it("should mark all mlogx commands as valid", () => {
        for (let line of allMlogxCommands) {
            expect(() => compileMlogxToMlog([line], {
                ...defaultSettings,
                filename: "sample2.mlogx",
                compilerOptions: {
                    ...defaultSettings.compilerOptions,
                    compileWithErrors: false
                }
            }, {})).not.toThrow();
        }
    });
});
