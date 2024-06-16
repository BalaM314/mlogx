import { buildingNameRegex, MindustryContent, shortOperandMappings } from "../consts.js";
export const GenericArgs = ((stuff) => new Map(stuff.map(([key, obj]) => [key, {
        alsoAccepts: obj.alsoAccepts ?? [],
        validator: obj.validator instanceof RegExp ? [obj.validator] : obj.validator,
        exclude: obj.exclude ?? [],
        doNotGuess: obj.doNotGuess ?? false,
        description: obj.description
    }])))([
    ["number", {
            validator: [
                /^-?\d+((\.\d+)|(e-?\d+))?$/,
                "@thisx", "@thisy", "@ipt", "@links",
                "@mapw", "@maph",
                "@pi", "π", "@e", "@degToRad", "@radToDeg",
                "@time", "@tick", "@second", "@minute", "@waveNumber", "@waveTime",
                "@ctrlProcessor", "@ctrlPlayer", "@ctrlCommand",
                "@itemCount", "@liquidCount", "@buildingCount", "@unitCount"
            ],
            alsoAccepts: ["variable", "boolean"],
            description: "Any numeric value. Can be a regular number like 5, -3.6, or a number in exponential notation like 1e2, which means 1 times 10 ^ 2."
        }],
    ["color", {
            validator: /^%[0-9a-f]{6}(?:[0-9a-f]{2})?$/i,
            alsoAccepts: ["variable", "number"],
            description: "Represents a value that is either true or false."
        }],
    ["string", {
            validator: /^"(?:[^"]|(\\"))*"$/,
            alsoAccepts: ["variable"],
            description: "A string of characters. Quotes within a string must be escaped by putting a backslash before them."
        }],
    ["boolean", {
            validator: ["true", "false"],
            alsoAccepts: ["variable", "number"],
            description: "Represents a value that is either true or false."
        }],
    ["buildingType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.buildings.includes(arg.slice(1)),
            alsoAccepts: ["variable"],
            description: "Represents a type of building, like @pulse-conduit."
        }],
    ["fluidType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.fluids.includes(arg.slice(1)),
            alsoAccepts: ["variable"],
            description: "Represents a fluid, like @oil."
        }],
    ["itemType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.items.includes(arg.slice(1)),
            alsoAccepts: ["variable"],
            description: "Represents a type of item, like @phase-fabric."
        }],
    ["unitType", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.units.includes(arg.slice(1)),
            alsoAccepts: ["variable"],
            description: "Represents a type of unit, like @gamma."
        }],
    ["imageType", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.buildings.includes(arg.slice(1)) || MindustryContent.fluids.includes(arg.slice(1)) || MindustryContent.items.includes(arg.slice(1)) || MindustryContent.units.includes(arg.slice(1))),
            alsoAccepts: ["variable"],
            description: "Represents anything that has an image and can be drawn on a display, like @meltdown, @cryofluid, etc."
        }],
    ["team", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.teams.includes(arg.slice(1)),
            alsoAccepts: ["variable", "number"],
            description: "Represents a team, like @sharded or @purple."
        }],
    ["senseable", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.senseables.includes(arg.slice(1))),
            alsoAccepts: ["variable", "itemType", "fluidType"],
            description: "Represents any piece of information that can be accessed about a building or unit, like x position(@x), whether it is shooting, (@shooting), the amount of lead it contains(@lead), etc."
        }],
    ["settable", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.settables.includes(arg.slice(1))),
            alsoAccepts: ["variable", "itemType", "fluidType"],
            description: "Represents any piece of information that can be set for a building or unit, like x position(@x), rotation, (@rotation), the amount of lead it contains(@lead), etc."
        }],
    ["building", {
            validator: [buildingNameRegex, "@this", "@air", "@ground"],
            alsoAccepts: ["variable"],
            description: "Represents an in-world building."
        }],
    ["unit", {
            validator: ["@unit"],
            alsoAccepts: ["variable"],
            description: "Represents an in-world unit."
        }],
    ["null", {
            validator: ["null"],
            alsoAccepts: [],
            description: "Represents no value."
        }],
    ["operandTest", {
            validator: [
                "equal", "notEqual", "strictEqual", "greaterThan",
                "lessThan", "greaterThanEq", "lessThanEq"
            ],
            description: "An operand used to compare two values, returning a true or false result."
        }],
    ["operandDouble", {
            validator: [
                "add", "sub", "mul", "div", "idiv", "mod", "pow",
                "equal", "notEqual", "land", "lessThan",
                "lessThanEq", "greaterThan", "greaterThanEq",
                "strictEqual", "shl", "shr", "or", "and",
                "xor", "min", "max", "angle", "len", "noise",
            ],
            description: "An operand that requires 2 values. Outputs either a boolean or a number."
        }],
    ["operandSingle", {
            validator: [
                "not", "abs", "log", "log10",
                "floor", "ceil", "sqrt", "rand", "sin",
                "cos", "tan", "asin", "acos", "atan"
            ],
            description: "An operand that only requires a single value."
        }],
    ["jumpAddress", {
            validator: /^[^":]+$/,
            alsoAccepts: ["number"],
            doNotGuess: true,
            description: "Something that can be jumped to. Can be either a jump label or a hardcoded jump index."
        }],
    ["invalid", {
            validator: [],
            description: "An invalid argument. Used internally."
        }],
    ["ctype", {
            validator: /:[\w-$]+/,
            description: "Used in the typed set statement, specifies the type of a variable. Example: :building :unitType"
        }],
    ["definedJumpLabel", {
            validator: /[\w-$()]+:/,
            description: "Defines a jump label. Example: label:, bind_unit:"
        }],
    ["sOperandDouble", {
            validator: Object.keys(shortOperandMappings.double),
            description: "An operand that requires 2 values. Outputs either a boolean or a number. Unlike operandDouble, this uses symbols such as <= instead of lessThanEq."
        }],
    ["sOperandTest", {
            validator: Object.keys(shortOperandMappings.test),
            description: "An operand that compares two values, returning true or false. Unlike operandDouble, this uses symbols such as <= instead of lessThanEq."
        }],
    ["targetClass", {
            validator: [
                "any", "enemy", "ally", "player", "attacker",
                "flying", "boss", "ground"
            ],
            doNotGuess: true,
            description: "A condition that can be used to filter the units obtained from the radar statement."
        }],
    ["unitSortCriteria", {
            validator: ["distance", "health", "shield", "armor", "maxHealth"],
            doNotGuess: true,
            description: "A property that can be used to sort units."
        }],
    ["buildingGroup", {
            validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"],
            doNotGuess: true,
            description: "A condition that can be used to filter buildings obtained from the ulocate statement."
        }],
    ["locateable", {
            validator: ["building", "ore", "spawn", "damaged"],
            doNotGuess: true,
            description: "Anything that is ulocateable."
        }],
    ["variable", {
            validator: [/^@?[^"{}[\]/\\:]+$/, "@counter"],
            exclude: ["number", "string", "boolean", "building", "buildingType", "unitType", "itemType", "fluidType", "imageType", "senseable", "unit", "null", "ctype", "team"],
            description: "Refers to a variable."
        }],
    ["getblockable", {
            validator: ["floor", "ore", "block", "building"],
            doNotGuess: true,
            description: "Anything that is getblockable."
        }],
    ["setblockable", {
            validator: ["floor", "ore", "block", "building"],
            doNotGuess: true,
            description: "Anything that is setblockable."
        }],
    ["ruleAny", {
            validator: ["currentWaveTimer", "waveTimer", "waves", "wave", "waveSpacing", "waveSending", "attackMode", "enemyCoreBuildRadius", "dropZoneRadius", "unitCap", "lighting", "ambientLight", "solarMultiplier", "buildSpeed", "unitBuildSpeed", "unitCost", "unitDamage", "blockHealth", "blockDamage", "rtsMinWeight", "rtsMinSquad", "mapArea"],
            doNotGuess: true,
            description: "A rule that can be set with setrule."
        }],
    ["ruleNormal", {
            validator: ["currentWaveTimer", "waveTimer", "waves", "wave", "waveSpacing", "waveSending", "attackMode", "enemyCoreBuildRadius", "dropZoneRadius", "unitCap", "lighting", "ambientLight", "solarMultiplier"],
            doNotGuess: true,
            description: "A normal rule that can be set with setrule."
        }],
    ["ruleTeam", {
            validator: ["buildSpeed", "unitBuildSpeed", "unitCost", "unitDamage", "blockHealth", "blockDamage", "rtsMinWeight", "rtsMinSquad"],
            doNotGuess: true,
            description: "A team-specific rule that can be set with setrule."
        }],
    ["fetchableCount", {
            validator: ["unitCount", "playerCount", "coreCount"],
            doNotGuess: true,
            description: "The size of a fetchable set, except build."
        }],
    ["statusEffect", {
            validator: ["none", "burning", "freezing", "unmoving", "slow", "wet", "muddy", "melting", "sapped", "tarred", "overdrive", "overclock", "shielded", "shocked", "blasted", "corroded", "boss", "sporeSlowed", "disarmed", "electrified", "invincible"],
            doNotGuess: true,
            description: "Any status effect."
        }],
    ["any", {
            validator: /.+/,
            alsoAccepts: ["variable"],
            doNotGuess: true,
            description: "Accepts anything except invalid arguments."
        }],
    ["effectNone", {
            validator: ["warn", "cross", "spawn"],
            doNotGuess: true,
            description: "A logic effect with no size, rotation, color, or data."
        }],
    ["effectData", {
            validator: ["blockFall"],
            doNotGuess: true,
            description: "A logic effect with data, but no size, rotation, or color."
        }],
    ["effectSize", {
            validator: ["placeBlock", "placeBlockSpark", "breakBlock"],
            doNotGuess: true,
            description: "A logic effect with size, but no rotation, color, or data."
        }],
    ["effectSizeColor", {
            validator: ["trail", "breakProp", "lightBlock", "crossExplosion", "wave"],
            doNotGuess: true,
            description: "A logic effect with size and color, but no rotation or data."
        }],
    ["effectColor", {
            validator: ["smokeCloud", "vapor", "hit", "hitSquare", "spark", "sparkBig", "drill", "drillBig", "smokePuff", "sparkExplosion"],
            doNotGuess: true,
            description: "A logic effect with color, but no size, rotation, or data."
        }],
    ["effectRotate", {
            validator: ["shootBig", "smokeSmall", "smokeBig"],
            doNotGuess: true,
            description: "A logic effect with rotation, but no size, color, or data."
        }],
    ["effectRotateColor", {
            validator: ["shootSmall", "shootBig", "smokeColor", "smokeSquare", "smokeSquareBig", "sparkShoot", "sparkShootBig"],
            doNotGuess: true,
            description: "A logic effect with rotation and color, but no size, or data."
        }],
    ["effectAny", {
            validator: ["warn", "cross", "blockFall", "placeBlock", "placeBlockSpark", "breakBlock", "spawn", "trail", "breakProp", "smokeCloud", "vapor", "hit", "hitSquare", "shootSmall", "shootBig", "smokeSmall", "smokeBig", "smokeColor", "smokeSquare", "smokeSquareBig", "spark", "sparkBig", "sparkShoot", "sparkShootBig", "drill", "drillBig", "lightBlock", "explosion", "smokePuff", "sparkExplosion", "crossExplosion", "wave", "bubble"],
            doNotGuess: true,
            description: "A logic effect."
        }],
]);
