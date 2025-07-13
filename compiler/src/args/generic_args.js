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
                /[+-]?0[bx]\d+/,
                "@thisx", "@thisy", "@ipt", "@links",
                "@mapw", "@maph",
                "@pi", "π", "@e", "@degToRad", "@radToDeg",
                "@time", "@tick", "@second", "@minute", "@waveNumber", "@waveTime",
                "@ctrlProcessor", "@ctrlPlayer", "@ctrlCommand",
                "@itemCount", "@liquidCount", "@buildingCount", "@unitCount",
            ],
            alsoAccepts: ["variable", "boolean", "color", "wait"],
            description: "Any numeric value. Can be a regular number like 5, -3.6, or a number in exponential notation like 1e2, which means 1 times 10 ^ 2."
        }],
    ["color", {
            validator: /^%[0-9a-f]{6}(?:[0-9a-f]{2})?$/i,
            alsoAccepts: ["variable", "number"],
            description: "Represents a color. Can be a hex code starting with a % sign, or a number."
        }],
    ["wait", {
            validator: ["@wait"],
            description: `Special value used for the "flush message" instruction.`
        }],
    ["string", {
            validator: [
                /^"(?:[^"]|(\\"))*"$/,
                "@clientLocale", "@clientUnit", "@clientName"
            ],
            alsoAccepts: ["variable"],
            description: "A string of characters. Quotes within a string must be escaped by putting a backslash before them."
        }],
    ["boolean", {
            validator: [
                "true", "false",
                "@server", "@client", "@clientMobile"
            ],
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
    ["senseTarget", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.buildings.includes(arg.slice(1)) ||
                    MindustryContent.fluids.includes(arg.slice(1)) ||
                    MindustryContent.items.includes(arg.slice(1)) ||
                    MindustryContent.units.includes(arg.slice(1))),
            alsoAccepts: ["variable", "unit", "building", "buildingType", "itemType", "unitType", "fluidType", "string"],
            description: "Represents a type of item, liquid, unit, or building."
        }],
    ["imageType", {
            validator: (arg) => arg.startsWith("@") &&
                (MindustryContent.buildings.includes(arg.slice(1)) || MindustryContent.fluids.includes(arg.slice(1)) || MindustryContent.items.includes(arg.slice(1)) || MindustryContent.units.includes(arg.slice(1))),
            alsoAccepts: ["variable", "buildingType", "itemType", "unitType", "fluidType"],
            description: "Represents anything that has an image and can be drawn on a display, like @meltdown, @cryofluid, etc."
        }],
    ["hasEmoji", {
            validator: () => false,
            alsoAccepts: ["variable", "buildingType", "itemType", "unitType", "fluidType"],
        }],
    ["team", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.teams.includes(arg.slice(1)),
            alsoAccepts: ["variable", "number"],
            description: "Represents a team, like @sharded or @purple."
        }],
    ["senseable", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.senseables.includes(arg.slice(1)),
            alsoAccepts: ["variable", "itemType", "fluidType"],
            description: "Represents any piece of information that can be accessed about a building or unit, like x position(@x), whether it is shooting, (@shooting), the amount of lead it contains(@lead), etc."
        }],
    ["settable", {
            validator: (arg) => arg.startsWith("@") &&
                MindustryContent.settables.includes(arg.slice(1)),
            alsoAccepts: ["variable", "itemType", "fluidType"],
            description: "Represents any piece of information that can be set for a building or unit, like x position(@x), rotation, (@rotation), the amount of lead it contains(@lead), etc."
        }],
    ["sound", {
            validator: (arg) => arg.startsWith("@sfx-") &&
                MindustryContent.sounds.includes(arg.slice(5)),
            alsoAccepts: ["variable", "buildingType", "itemType", "unitType", "fluidType"],
            description: "Represents anything that has an image and can be drawn on a display, like @meltdown, @cryofluid, etc."
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
            validator: [/^@?[^"{}/\\:]+$/, "@counter"],
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
export const SenseTargets = ["building", "unit", "buildingType", "itemType", "unitType", "fluidType", "string"];
export const sensorMapping = {
    itemType: {
        "color": "color",
        "id": "number",
        "name": "string",
    },
    fluidType: {
        "color": "color",
        "id": "number",
        "name": "string",
    },
    buildingType: {
        "color": "number",
        "id": "number",
        "name": "string",
        "health": "number",
        "maxHealth": "number",
        "solid": "boolean",
        "size": "number",
        "itemCapacity": "number",
        "liquidCapacity": "number",
        "powerCapacity": "number",
    },
    unitType: {
        "id": "number",
        "name": "string",
        "health": "number",
        "maxHealth": "number",
        "size": "number",
        "itemCapacity": "number",
        "speed": "number",
        "payloadCapacity": "number",
    },
    unit: {
        "totalItems": "number",
        "itemCapacity": "number",
        "rotation": "number",
        "health": "number",
        "shield": "number",
        "maxHealth": "number",
        "ammo": "number",
        "ammoCapacity": "number",
        "x": "number",
        "y": "number",
        "velocityX": "number",
        "velocityY": "number",
        "dead": "boolean",
        "team": "number",
        "shooting": "boolean",
        "boosting": "boolean",
        "range": "number",
        "shootX": "number",
        "shootY": "number",
        "cameraX": "number",
        "cameraY": "number",
        "cameraWidth": "number",
        "cameraHeight": "number",
        "mining": "number",
        "mineX": "number",
        "mineY": "number",
        "armor": "number",
        "flag": "number",
        "speed": "number",
        "controlled": "number",
        "payloadCount": "number",
        "size": "number",
        "color": "number",
        "type": "unitType",
        "name": "string",
        "firstItem": "itemType",
        "controller": ["unit", "building"],
        "payloadType": ["unitType", "buildingType"],
        "payloadCapacity": "number",
        "totalPayload": "number",
        ...Object.fromEntries([...MindustryContent.items].map(n => [n, "number"]))
    },
    building: {
        "x": "number",
        "y": "number",
        "color": "color",
        "dead": "boolean",
        "solid": "boolean",
        "team": "number",
        "health": "number",
        "maxHealth": "number",
        "efficiency": "number",
        "timescale": "number",
        "range": "number",
        "rotation": "number",
        "totalItems": "number",
        "totalLiquids": "number",
        "totalPower": "number",
        "itemCapacity": "number",
        "liquidCapacity": "number",
        "powerCapacity": "number",
        "powerNetIn": "number",
        "powerNetOut": "number",
        "powerNetStored": "number",
        "powerNetCapacity": "number",
        "enabled": "boolean",
        "controlled": "number",
        "payloadCount": "number",
        "size": "number",
        "cameraX": "number",
        "cameraY": "number",
        "cameraWidth": "number",
        "cameraHeight": "number",
        "type": "buildingType",
        "firstItem": "itemType",
        "config": "any",
        "payloadType": ["unitType", "buildingType"],
        "memoryCapacity": "number",
        "progress": "number",
        "shootX": "number",
        "shootY": "number",
        "shooting": "boolean",
        "heat": "number",
        "shield": "number",
        "currentAmmoType": "itemType",
        ...Object.fromEntries([...MindustryContent.items, ...MindustryContent.fluids].map(n => [n, "number"]))
    },
    string: {
        "size": "number",
    },
    any: {}
};
sensorMapping.any = Object.assign({}, ...Object.values(sensorMapping));
Object.values(sensorMapping).forEach(o => Object.setPrototypeOf(o, null));
