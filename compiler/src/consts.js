import { reverseObject } from "./funcs.js";
export const compilerMark = [
    `print "Made with mlogx"`,
    `print "github.com/BalaM314/mlogx/"`
];
export const bugReportUrl = `https://github.com/BalaM314/mlogx/issues/new`;
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
                lineNumber: 0,
                sourceFilename: "[processor variable]"
            }
        }]
};
export const maxLines = 999;
export const shortOperandMappings = {
    double: {
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
    },
    test: {
        "~=": "equal",
        "==": "strictEqual",
        "!=": "notEqual",
        "<>": "notEqual",
        "<": "lessThan",
        ">": "greaterThan",
        "<=": "lessThanEq",
        ">=": "greaterThanEq",
    }
};
export const shortOperandMappingsReversed = {
    double: reverseObject(shortOperandMappings.double),
    test: reverseObject(shortOperandMappings.test),
};
export const MindustryContent = {
    items: ["copper", "lead", "metaglass", "graphite", "sand", "coal", "titanium", "thorium", "scrap", "silicon", "plastanium", "phase-fabric", "surge-alloy", "spore-pod", "blast-compound", "pyratite", "beryllium", "fissile-matter", "dormant-cyst", "tungsten", "carbide", "oxide"],
    buildings: ["graphite-press", "multi-press", "silicon-smelter", "silicon-crucible", "kiln", "plastanium-compressor", "phase-weaver", "cryofluid-mixer", "pyratite-mixer", "blast-mixer", "melter", "separator", "disassembler", "spore-press", "pulverizer", "coal-centrifuge", "incinerator", "copper-wall", "copper-wall-large", "titanium-wall", "titanium-wall-large", "plastanium-wall", "plastanium-wall-large", "thorium-wall", "thorium-wall-large", "phase-wall", "phase-wall-large", "surge-wall", "surge-wall-large", "door", "door-large", "scrap-wall", "scrap-wall-large", "scrap-wall-huge", "scrap-wall-gigantic", "mender", "mend-projector", "overdrive-projector", "overdrive-dome", "force-projector", "shock-mine", "conveyor", "titanium-conveyor", "plastanium-conveyor", "armored-conveyor", "junction", "bridge-conveyor", "phase-conveyor", "sorter", "inverted-sorter", "router", "distributor", "overflow-gate", "underflow-gate", "mass-driver", "duct", "duct-router", "duct-bridge", "mechanical-pump", "rotary-pump", "conduit", "pulse-conduit", "plated-conduit", "liquid-router", "liquid-tank", "liquid-junction", "bridge-conduit", "phase-conduit", "power-node", "power-node-large", "surge-tower", "diode", "battery", "battery-large", "combustion-generator", "thermal-generator", "steam-generator", "differential-generator", "rtg-generator", "solar-panel", "solar-panel-large", "thorium-reactor", "impact-reactor", "mechanical-drill", "pneumatic-drill", "laser-drill", "blast-drill", "water-extractor", "cultivator", "oil-extractor", "core-shard", "core-foundation", "core-nucleus", "vault", "container", "unloader", "duo", "scatter", "scorch", "hail", "wave", "lancer", "arc", "parallax", "swarmer", "salvo", "segment", "tsunami", "fuse", "ripple", "cyclone", "foreshadow", "spectre", "meltdown", "command-center", "ground-factory", "air-factory", "naval-factory", "additive-reconstructor", "multiplicative-reconstructor", "exponential-reconstructor", "tetrative-reconstructor", "repair-point", "repair-turret", "payload-conveyor", "payload-router", "payload-propulsion-tower", "power-source", "power-void", "item-source", "item-void", "liquid-source", "liquid-void", "payload-void", "payload-source", "illuminator", "launch-pad", "interplanetary-accelerator", "message", "switch", "micro-processor", "logic-processor", "hyper-processor", "memory-cell", "memory-bank", "logic-display", "large-logic-display", "liquid-container", "deconstructor", "constructor", "thruster", "large-constructor", "payload-loader", "payload-unloader", "silicon-arc-furnace", "cliff-crusher", "plasma-bore", "reinforced-liquid-junction", "breach", "core-bastion", "turbine-condenser", "beam-node", "beam-tower", "build-tower", "impact-drill", "carbide-crucible", "surge-conveyor", "duct-unloader", "surge-router", "reinforced-conduit", "reinforced-liquid-router", "reinforced-liquid-container", "reinforced-liquid-tank", "reinforced-bridge-conduit", "core-citadel", "core-acropolis", "heat-reactor", "impulse-pump", "reinforced-pump", "electrolyzer", "oxidation-chamber", "surge-smelter", "surge-crucible", "overflow-duct", "large-plasma-bore", "cyanogen-synthesizer", "slag-centrifuge", "electric-heater", "slag-incinerator", "phase-synthesizer", "sublimate", "reinforced-container", "reinforced-vault", "atmospheric-concentrator", "unit-cargo-loader", "unit-cargo-unload-point", "chemical-combustion-chamber", "pyrolysis-generator", "regen-projector", "titan", "small-deconstructor", "vent-condenser", "phase-heater", "heat-redirector", "tungsten-wall", "tungsten-wall-large", "tank-assembler", "beryllium-wall", "beryllium-wall-large", "eruption-drill", "ship-assembler", "mech-assembler", "shield-projector", "beam-link", "world-processor", "reinforced-payload-conveyor", "reinforced-payload-router", "disperse", "large-shield-projector", "payload-mass-driver", "world-cell", "carbide-wall", "carbide-wall-large", "tank-fabricator", "mech-fabricator", "ship-fabricator", "reinforced-surge-wall", "radar", "blast-door", "canvas", "armored-duct", "shield-breaker", "unit-repair-tower", "diffuse", "prime-refabricator", "basic-assembler-module", "reinforced-surge-wall-large", "tank-refabricator", "mech-refabricator", "ship-refabricator", "slag-heater", "afflict", "shielded-wall", "lustre", "scathe", "smite", "underflow-duct", "malign", "shockwave-tower", "heat-source", "flux-reactor", "neoplasia-reactor"],
    buildingInternalNames: [],
    fluids: ["water", "slag", "oil", "cryofluid", "neoplasm", "hydrogen", "ozone", "cyanogen", "gallium", "nitrogen", "arkycite"],
    units: ["dagger", "mace", "fortress", "scepter", "reign", "nova", "pulsar", "quasar", "vela", "corvus", "crawler", "atrax", "spiroct", "arkyid", "toxopid", "flare", "horizon", "zenith", "antumbra", "eclipse", "mono", "poly", "mega", "quad", "oct", "risso", "minke", "bryde", "sei", "omura", "retusa", "oxynoe", "cyerce", "aegires", "navanax", "alpha", "beta", "gamma", "stell", "locus", "precept", "vanquish", "conquer", "merui", "cleroi", "anthicus", "tecta", "collaris", "elude", "avert", "obviate", "quell", "disrupt", "evoke", "incite", "emanate"],
    senseables: ["totalItems", "firstItem", "totalLiquids", "totalPower", "itemCapacity", "liquidCapacity", "powerCapacity", "powerNetStored", "powerNetCapacity", "powerNetIn", "powerNetOut", "ammo", "ammoCapacity", "health", "maxHealth", "heat", "efficiency", "progress", "timescale", "rotation", "x", "y", "shootX", "shootY", "size", "dead", "range", "shooting", "boosting", "mineX", "mineY", "mining", "speed", "team", "type", "flag", "controlled", "controller", "name", "payloadCount", "payloadType", "enabled", "shoot", "shootp", "config", "color"],
    settables: ["x", "y", "rotation", "team", "flag", "health", "totalPower", "payloadType"],
    teams: ["derelict", "sharded", "crux", "malis", "green", "blue", "neoplastic"],
};
MindustryContent.senseables.push(...MindustryContent.items);
MindustryContent.senseables.push(...MindustryContent.fluids);
MindustryContent.settables.push(...MindustryContent.items);
MindustryContent.settables.push(...MindustryContent.fluids);
MindustryContent.buildingInternalNames = [...new Set(MindustryContent.buildings.map(build => build.split("-").reverse().find(s => !["large", "huge", "gigantic"].includes(s))))];
export const buildingNameRegex = new RegExp(`^(${MindustryContent.buildingInternalNames.map(el => `(${el})`).join("|")})[\\d]+$`);
