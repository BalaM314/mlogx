import * as yup from "yup";
export const settingsSchema = yup.object({
    name: yup.string().default("Untitled Project"),
    authors: yup.array().of(yup.string()).default(["Unknown"]),
    filename: yup.string().default("unknown.mlogx"),
    compilerOptions: yup.object({
        include: yup.array().of(yup.string()).default([]),
        verbose: yup.bool().default(false),
        removeComments: yup.bool().default(true),
        compileWithErrors: yup.bool().default(true),
        mode: yup.string().oneOf(["project", "single"]),
        prependFileName: yup.bool().default(true),
        checkTypes: yup.bool().default(true),
        removeUnusedJumpLabels: yup.bool().default(true),
        removeCompilerMark: yup.bool().default(false),
    }).required(),
    compilerConstants: yup.object().default({})
}).required();
