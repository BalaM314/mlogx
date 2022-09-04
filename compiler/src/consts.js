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
export const GenericArgs = ((stuff) => new Map(Array.from(stuff.entries())
    .map(([key, obj]) => [key, {
        alsoAccepts: obj.alsoAccepts ?? [],
        validator: obj.validator instanceof RegExp ? [obj.validator] : obj.validator,
        exclude: obj.exclude ?? []
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
            alsoAccepts: ["number"]
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
            ]
        }],
    ["unitSortCriteria", {
            validator: ["distance", "health", "shield", "armor", "maxHealth"]
        }],
    ["buildingGroup", {
            validator: ["core", "storage", "generator", "turret", "factory", "repair", "battery", "rally", "reactor"]
        }],
    ["lookupType", {
            validator: ["building", "unit", "fluid", "item"]
        }],
    ["variable", {
            validator: [/^@?[^"@()[\]{}/\\:]+$/, "@counter"],
            exclude: ["number", "string", "boolean", "building", "buildingType", "unitType", "itemType", "fluidType", "imageType", "senseable", "unit", "null", "ctype"]
        }],
    ["any", {
            validator: /.+/,
            alsoAccepts: []
        }],
]));
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
export const MindustryContent = {
    items: ["copper", "lead", "metaglass", "graphite", "sand", "coal", "titanium", "thorium", "scrap", "silicon", "plastanium", "phase-fabric", "surge-alloy", "spore-pod", "blast-compound", "pyratite", "beryllium", "fissile-matter", "dormant-cyst", "tungsten", "carbide", "oxide"],
    buildings: ["graphite-press", "multi-press", "silicon-smelter", "silicon-crucible", "kiln", "plastanium-compressor", "phase-weaver", "cryofluid-mixer", "pyratite-mixer", "blast-mixer", "melter", "separator", "disassembler", "spore-press", "pulverizer", "coal-centrifuge", "incinerator", "copper-wall", "copper-wall-large", "titanium-wall", "titanium-wall-large", "plastanium-wall", "plastanium-wall-large", "thorium-wall", "thorium-wall-large", "phase-wall", "phase-wall-large", "surge-wall", "surge-wall-large", "door", "door-large", "scrap-wall", "scrap-wall-large", "scrap-wall-huge", "scrap-wall-gigantic", "mender", "mend-projector", "overdrive-projector", "overdrive-dome", "force-projector", "shock-mine", "conveyor", "titanium-conveyor", "plastanium-conveyor", "armored-conveyor", "junction", "bridge-conveyor", "phase-conveyor", "sorter", "inverted-sorter", "router", "distributor", "overflow-gate", "underflow-gate", "mass-driver", "duct", "duct-router", "duct-bridge", "mechanical-pump", "rotary-pump", "conduit", "pulse-conduit", "plated-conduit", "liquid-router", "liquid-tank", "liquid-junction", "bridge-conduit", "phase-conduit", "power-node", "power-node-large", "surge-tower", "diode", "battery", "battery-large", "combustion-generator", "thermal-generator", "steam-generator", "differential-generator", "rtg-generator", "solar-panel", "solar-panel-large", "thorium-reactor", "impact-reactor", "mechanical-drill", "pneumatic-drill", "laser-drill", "blast-drill", "water-extractor", "cultivator", "oil-extractor", "core-shard", "core-foundation", "core-nucleus", "vault", "container", "unloader", "duo", "scatter", "scorch", "hail", "wave", "lancer", "arc", "parallax", "swarmer", "salvo", "segment", "tsunami", "fuse", "ripple", "cyclone", "foreshadow", "spectre", "meltdown", "command-center", "ground-factory", "air-factory", "naval-factory", "additive-reconstructor", "multiplicative-reconstructor", "exponential-reconstructor", "tetrative-reconstructor", "repair-point", "repair-turret", "payload-conveyor", "payload-router", "payload-propulsion-tower", "power-source", "power-void", "item-source", "item-void", "liquid-source", "liquid-void", "payload-void", "payload-source", "illuminator", "launch-pad", "interplanetary-accelerator", "message", "switch", "micro-processor", "logic-processor", "hyper-processor", "memory-cell", "memory-bank", "logic-display", "large-logic-display", "liquid-container", "deconstructor", "constructor", "thruster", "large-constructor", "payload-loader", "payload-unloader", "silicon-arc-furnace", "cliff-crusher", "plasma-bore", "reinforced-liquid-junction", "breach", "core-bastion", "turbine-condenser", "beam-node", "beam-tower", "build-tower", "impact-drill", "carbide-crucible", "surge-conveyor", "duct-unloader", "surge-router", "reinforced-conduit", "reinforced-liquid-router", "reinforced-liquid-container", "reinforced-liquid-tank", "reinforced-bridge-conduit", "core-citadel", "core-acropolis", "heat-reactor", "impulse-pump", "reinforced-pump", "electrolyzer", "oxidation-chamber", "surge-smelter", "surge-crucible", "overflow-duct", "large-plasma-bore", "cyanogen-synthesizer", "slag-centrifuge", "electric-heater", "slag-incinerator", "phase-synthesizer", "sublimate", "reinforced-container", "reinforced-vault", "atmospheric-concentrator", "unit-cargo-loader", "unit-cargo-unload-point", "chemical-combustion-chamber", "pyrolysis-generator", "regen-projector", "titan", "small-deconstructor", "vent-condenser", "phase-heater", "heat-redirector", "tungsten-wall", "tungsten-wall-large", "tank-assembler", "beryllium-wall", "beryllium-wall-large", "eruption-drill", "ship-assembler", "mech-assembler", "shield-projector", "beam-link", "world-processor", "reinforced-payload-conveyor", "reinforced-payload-router", "disperse", "large-shield-projector", "payload-mass-driver", "world-cell", "carbide-wall", "carbide-wall-large", "tank-fabricator", "mech-fabricator", "ship-fabricator", "reinforced-surge-wall", "radar", "blast-door", "canvas", "armored-duct", "shield-breaker", "unit-repair-tower", "diffuse", "prime-refabricator", "basic-assembler-module", "reinforced-surge-wall-large", "tank-refabricator", "mech-refabricator", "ship-refabricator", "slag-heater", "afflict", "shielded-wall", "lustre", "scathe", "smite", "underflow-duct", "malign", "shockwave-tower", "heat-source", "flux-reactor", "neoplasia-reactor"],
    fluids: ["water", "slag", "oil", "cryofluid", "neoplasm", "hydrogen", "ozone", "cyanogen", "gallium", "nitrogen", "arkycite"],
    units: ["dagger", "mace", "fortress", "scepter", "reign", "nova", "pulsar", "quasar", "vela", "corvus", "crawler", "atrax", "spiroct", "arkyid", "toxopid", "flare", "horizon", "zenith", "antumbra", "eclipse", "mono", "poly", "mega", "quad", "oct", "risso", "minke", "bryde", "sei", "omura", "retusa", "oxynoe", "cyerce", "aegires", "navanax", "alpha", "beta", "gamma", "stell", "locus", "precept", "vanquish", "conquer", "merui", "cleroi", "anthicus", "tecta", "collaris", "elude", "avert", "obviate", "quell", "disrupt", "evoke", "incite", "emanate"],
    senseables: ["totalItems", "firstItem", "totalLiquids", "totalPower", "itemCapacity", "liquidCapacity", "powerCapacity", "powerNetStored", "powerNetCapacity", "powerNetIn", "powerNetOut", "ammo", "ammoCapacity", "health", "maxHealth", "heat", "efficiency", "progress", "timescale", "rotation", "x", "y", "shootX", "shootY", "size", "dead", "range", "shooting", "boosting", "mineX", "mineY", "mining", "speed", "team", "type", "flag", "controlled", "controller", "name", "payloadCount", "payloadType", "enabled", "shoot", "shootp", "config", "color"],
};
MindustryContent.senseables.push(...MindustryContent.items);
MindustryContent.senseables.push(...MindustryContent.fluids);
