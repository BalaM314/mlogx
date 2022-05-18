import { GenericArgType } from "./types.js";
export const compilerMark = `print "Made with mlogx"
print "github.com/BalaM314/mlogx/"`;
export const defaultSettings = {
    name: "",
    authors: [],
    compilerOptions: {
        include: [],
        removeComments: true,
        compileWithErrors: true,
        mode: "single",
        prependFileName: true,
        checkTypes: true,
    },
    compilerVariables: {}
};
export const requiredVarCode = {
    "cookie": [
        `op mul cookie @thisx @maph`,
        `op add cookie @thisy cookie`
    ]
};
export const processorVariables = {
    "@counter": [{
            variableType: GenericArgType.number,
            line: "[processor variable]"
        }]
};
