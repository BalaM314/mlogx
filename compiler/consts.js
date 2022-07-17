import { GAT } from "./types.js";
export const compilerMark = [
    `print "Made with mlogx"`,
    `print "github.com/BalaM314/mlogx/"`
];
export const defaultSettings = {
    name: "",
    authors: [],
    compilerOptions: {
        include: [],
        verbose: false,
        removeComments: true,
        compileWithErrors: true,
        mode: "single",
        prependFileName: true,
        checkTypes: true,
    },
    compilerConstants: {}
};
export const requiredVarCode = {
    "cookie": [
        `op mul cookie @thisx @maph`,
        `op add cookie @thisy cookie`
    ]
};
export const processorVariables = {
    "@counter": [{
            variableType: GAT.number,
            line: {
                text: "[processor variable]",
                lineNumber: 0
            }
        }]
};
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
