import * as yup from "yup";
export const settingsSchema = yup.object({
    name: yup.string().default("Untitled Project"),
    authors: yup.array(yup.string().required()).default(["Unknown"]),
    compilerOptions: yup.object({
        include: yup.array(yup.string().required()).default([]),
        removeComments: yup.bool().default(true),
        compileWithErrors: yup.bool().default(false),
        mode: yup.string().oneOf(["project", "single"]).default("single"),
        prependFileName: yup.bool().default(true),
        checkTypes: yup.bool().default(true),
        removeUnusedJumpLabels: yup.bool().default(true),
        removeCompilerMark: yup.bool().default(false),
    }).required(),
    compilerConstants: yup.object().default({})
}).required();
