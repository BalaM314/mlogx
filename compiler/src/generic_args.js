import { MindustryContent, buildingNameRegex, shortOperandMapping } from "./consts.js";
export const GenericArgs = ((stuff) => new Map(Array.from(stuff.entries())
    .map(([key, obj]) => [key, {
        alsoAccepts: obj.alsoAccepts ?? [],
        validator: obj.validator instanceof RegExp ? [obj.validator] : obj.validator,
        exclude: obj.exclude ?? [],
        doNotGuess: obj.doNotGuess ?? false
    }])))(new Map([
    ["number", {
            validator: [
                /^-?\d+((\.\d+)|(e-?\d+))?$/,
                "@thisx", "@thisy", "@ipt", "@links",
                "@time", "@tick", "@mapw", "@maph",
            ],
            alsoAccepts: ["variable", "boolean"]
        }],
    ["string", {
            validator: /^"(?:[^"]|(\\"))*"$/,
            alsoAccepts: ["variable"]
        }],
    ["boolean", {
            validator: ["true", "false"],
            alsoAccepts: ["variable", "number"]
        }],
    ["buildingType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.buildings.includes(arg.slice(1)),
            alsoAccepts: ["variable"]
        }],
    ["fluidType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.fluids.includes(arg.slice(1)),
            alsoAccepts: ["variable"]
        }],
    ["itemType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.items.includes(arg.slice(1)),
            alsoAccepts: ["variable"]
        }],
    ["unitType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.units.includes(arg.slice(1)),
            alsoAccepts: ["variable"]
        }],
    ["imageType", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.buildings.includes(arg.slice(1)) || MindustryContent.fluids.includes(arg.slice(1)) || MindustryContent.items.includes(arg.slice(1)) || MindustryContent.units.includes(arg.slice(1))),
            alsoAccepts: ["variable"]
        }],
    ["senseable", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.senseables.includes(arg.slice(1))),
            alsoAccepts: ["variable"]
        }],
    ["building", {
            validator: [buildingNameRegex, "@this"],
            alsoAccepts: ["variable"]
        }],
    ["unit", {
            validator: ["@unit"],
            alsoAccepts: ["variable"]
        }],
    ["null", {
            validator: ["null"],
            alsoAccepts: []
        }],
    ["operandTest", {
            validator: [
                "equal", "notEqual", "strictEqual", "greaterThan",
                "lessThan", "greaterThanEq", "lessThanEq", "always"
            ]
        }],
    ["operandDouble", {
            validator: [
                "add", "sub", "mul", "div", "idiv", "mod", "pow",
                "equal", "notEqual", "land", "lessThan",
                "lessThanEq", "greaterThan", "greaterThanEq",
                "strictEqual", "shl", "shr", "or", "and",
                "xor", "min", "angle", "len", "noise",
            ]
        }],
    ["operandSingle", {
            validator: [
                "not", "max", "abs", "log", "log10",
                "floor", "ceil", "sqrt", "rand", "sin",
                "cos", "tan", "asin", "acos", "atan"
            ]
        }],
    ["jumpAddress", {
            validator: /^[^":]+$/,
            alsoAccepts: ["number"],
            doNotGuess: true,
        }],
    ["invalid", {
            validator: []
        }],
    ["ctype", {
            validator: /:[\w-$]+/
        }],
    ["sOperandDouble", {
            validator: (arg) => arg in shortOperandMapping
        }],
    ["targetClass", {
            validator: [
                "any", "enemy", "ally", "player", "attacker",
                "flying", "boss", "ground"
            ],
            doNotGuess: true,
        }],
    ["unitSortCriteria", {
            validator: ["distance", "health", "shield", "armor", "maxHealth"],
            doNotGuess: true,
        }],
    ["buildingGroup", {
            validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"],
            doNotGuess: true,
        }],
    ["locateable", {
            validator: ["building", "ore", "spawn", "damaged"],
            doNotGuess: true,
        }],
    ["lookupType", {
            validator: ["building", "unit", "fluid", "item"],
            doNotGuess: true,
        }],
    ["variable", {
            validator: [/^@?[^"@[\]{}/\\:]+$/, "@counter"],
            exclude: ["number", "string", "boolean", "building", "buildingType", "unitType", "itemType", "fluidType", "imageType", "senseable", "unit", "null", "ctype"]
        }],
    ["any", {
            validator: /.+/,
            alsoAccepts: ["variable"],
            doNotGuess: true,
        }],
]));
