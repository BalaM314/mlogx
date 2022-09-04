import * as yup from "yup";
export const compilerMark = [
    `print "Made with mlogx"`,
    `print "github.com/BalaM314/mlogx/"`
];
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
export const buildingInternalNames = [
    "press", "smelter", "crucible", "kiln", "compressor",
    "weaver", "mixer", "melter", "separator", "disassembler",
    "pulverizer", "centrifuge", "incinerator", "wall",
    "door", "thruster", "mender", "projector", "dome",
    "mine", "conveyor", "junction", "sorter", "router",
    "distributor", "gate", "driver", "duct", "bridge",
    "pump", "conduit", "container", "tank", "node", "tower",
    "diode", "battery", "generator", "panel", "reactor",
    "drill", "extractor", "cultivator", "shard", "foundation",
    "nucleus", "vault", "unloader", "duo", "scatter",
    "scorch", "hail", "wave", "lancer", "arc", "parallax",
    "swarmer", "salvo", "segment", "tsunami", "fuse", "ripple",
    "cyclone", "foreshadow", "spectre", "meltdown", "center",
    "factory", "reconstructor", "point", "turret",
    "deconstructor", "constructor", "loader", "source",
    "void", "illuminator", "air", "ground", "pad",
    "accelerator", "message", "switch", "processor",
    "cell", "bank", "display"
];
export const buildingNameRegex = new RegExp(`^(${buildingInternalNames.map(el => `(${el})`).join("|")})[\\d]+$`);
export const GenericArgs = ((stuff) => Object.fromEntries(Object.entries(stuff)
    .map(([key, obj]) => [key, {
        alsoAccepts: obj.alsoAccepts ?? [],
        validator: obj.validator instanceof RegExp ? [obj.validator] : obj.validator
    }])))({
    number: {
        validator: [
            /^-?\d+((\.\d+)|(e-?\d+))?$/,
            "@thisx", "@thisy", "@ipt", "@links",
            "@time", "@tick", "@mapw", "@maph",
        ],
        alsoAccepts: ["variable", "boolean"]
    },
    string: {
        validator: /^"(?:[^"]|(\\"))*"$/,
        alsoAccepts: ["variable"]
    },
    boolean: {
        validator: ["true", "false"],
        alsoAccepts: ["variable", "number"]
    },
    type: {
        validator: (arg) => arg.startsWith("@") && !["@unit", "@thisx", "@thisy", "@this", "@ipt", "@links", "@time", "@tick", "@mapw", "@maph", "@counter"].includes(arg),
        alsoAccepts: ["variable"]
    },
    building: {
        validator: [buildingNameRegex, "@this"],
        alsoAccepts: ["variable"]
    },
    unit: {
        validator: ["@unit"],
        alsoAccepts: ["variable"]
    },
    any: {
        validator: /.+/,
        alsoAccepts: []
    },
    null: {
        validator: ["null"],
        alsoAccepts: []
    },
    operandTest: {
        validator: [
            "equal", "notEqual", "strictEqual", "greaterThan",
            "lessThan", "greaterThanEq", "lessThanEq", "always"
        ]
    },
    targetClass: {
        validator: [
            "any", "enemy", "ally", "player", "attacker",
            "flying", "boss", "ground"
        ]
    },
    unitSortCriteria: {
        validator: ["distance", "health", "shield", "armor", "maxHealth"]
    },
    operandDouble: {
        validator: [
            "add", "sub", "mul", "div", "idiv", "mod", "pow",
            "equal", "notEqual", "land", "lessThan",
            "lessThanEq", "greaterThan", "greaterThanEq",
            "strictEqual", "shl", "shr", "or", "and",
            "xor", "min", "angle", "len", "noise",
        ]
    },
    operandSingle: {
        validator: [
            "not", "max", "abs", "log", "log10",
            "floor", "ceil", "sqrt", "rand", "sin",
            "cos", "tan", "asin", "acos", "atan"
        ]
    },
    lookupType: {
        validator: ["building", "unit", "fluid", "item"]
    },
    jumpAddress: {
        validator: /^[^":]+$/,
        alsoAccepts: ["number"]
    },
    buildingGroup: {
        validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"]
    },
    invalid: {
        validator: []
    },
    ctype: {
        validator: /:[\w-$]+/
    },
    sOperandDouble: {
        validator: (arg) => arg in shortOperandMapping
    },
    variable: {
        validator: /^[^"]+$/
    },
});
export const requiredVarCode = {
    "cookie": [[
            `op mul cookie @thisx @maph`,
            `op add cookie @thisy cookie`
        ], "number"]
};
export const maxLoops = 200;
export const processorVariables = {
    "@counter": [{
            variableType: "number",
            line: {
                text: "[processor variable]",
                lineNumber: 0
            }
        }]
};
export const maxLines = 999;
export const shortOperandMapping = {
    "+": "add",
    "-": "sub",
    "*": "mul",
    "/": "div",
    "//": "idiv",
    "**": "pow",
    "~=": "equal",
    "==": "strictEqual",
    "!=": "notEqual",
    "<>": "notEqual",
    "&&": "land",
    "<": "lessThan",
    "<=": "lessThanEq",
    ">": "greaterThan",
    ">=": "greaterThanEq",
    "<<": "shl",
    ">>": "shr",
    "|": "or",
    "||": "or",
    "&": "and",
    "^": "xor",
};
