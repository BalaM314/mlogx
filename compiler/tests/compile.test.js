import { compileMlogxToMlog } from "../compile.js";
import { defaultSettings } from "../consts";
import { allMlogCommands } from "./samplePrograms.js";
test("Sample program 1 contains only mlog commands and should compile without changes", () => {
    let allMlogCommandsCompiled = compileMlogxToMlog(allMlogCommands, {
        ...defaultSettings,
        filename: "sample1.mlogx",
        compilerOptions: {
            ...defaultSettings.compilerOptions,
            compileWithErrors: false
        }
    }, {});
    expect(allMlogCommandsCompiled).toStrictEqual(allMlogCommands);
});
