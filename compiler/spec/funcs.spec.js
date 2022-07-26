import { Arg } from "../classes.js";
import commands from "../commands.js";
import { processCommands, addNamespacesToLine, getAllPossibleVariablesUsed, getJumpLabelUsed, getParameters, getVariablesUsed, isArgOfType, removeUnusedJumps, replaceCompilerConstants, splitLineIntoArguments, transformCommand, transformVariables, getVariablesDefined, cleanLine, isGenericArg, typeofArg, parseIcons, addNamespacesToVariable, prependFilenameToArg, getJumpLabel, inForLoop, topForLoop, inNamespace, parsePreprocessorDirectives, getCommandDefinitions, getCommandDefinition, isCommand, areAnyOfInputsCompatibleWithType, typesAreCompatible, acceptsVariable, addSourcesToCode } from "../funcs.js";
import { GAT } from "../types.js";
describe("templateFunction", () => {
    it("should ", () => {
        expect("functionThing").toEqual("functionThing");
    });
});
describe("isGenericArg", () => {
    it("should determine if an arg is generic", () => {
        for (const genericArg of Object.values(GAT)) {
            expect(isGenericArg(genericArg)).toBe(true);
        }
    });
});
describe("typeofArg", () => {
    it("should determine the type of an arg", () => {
        const args = [
            ["@unit", GAT.unit],
            ["@thisx", GAT.number],
            ["@this", GAT.building],
            ["greaterThanEq", GAT.operandTest],
            ["-50.2", GAT.number],
            [`"amogus"`, GAT.string],
            [`:number`, GAT.ctype],
        ];
        for (const [arg, expectedOutput] of args) {
            expect(typeofArg(arg)).toBe(expectedOutput);
        }
    });
});
describe("isArgOfType", () => {
    it("should determine if an arg is of specified type", () => {
        const correctTypes = [
            ["@unit", GAT.unit],
            ["@thisx", GAT.number],
            ["@this", GAT.building],
            ["greaterThanEq", GAT.operandTest],
            ["-50.2", GAT.number],
            [`"amogus"`, GAT.string],
            ["sussyFlarogus", GAT.unit],
            [`:number`, GAT.ctype],
            [`add`, GAT.operandDouble],
            [`cos`, GAT.operandSingle]
        ];
        for (const [arg, expectedType] of correctTypes) {
            expect(isArgOfType(arg, new Arg(expectedType))).toBe(true);
        }
    });
    it("should determine if an arg is not of specified type", () => {
        const wrongTypes = [
            ["@unit", GAT.building],
            ["@thisx", GAT.operandTest],
            ["@this", GAT.string],
            ["greaterThanEq", GAT.buildingGroup],
            ["-50.2", GAT.unit],
            [`"amogus"`, GAT.number],
            [`:number`, GAT.variable],
        ];
        for (const [arg, unexpectedType] of wrongTypes) {
            expect(isArgOfType(arg, new Arg(unexpectedType))).toBe(false);
        }
    });
});
describe("removeTrailingSpaces", () => {
    it("should remove trailing and leading spaces and tabs", () => {
        expect(cleanLine("    set x 5")).toBe("set x 5");
        expect(cleanLine("set x 5  ")).toBe("set x 5");
        expect(cleanLine("\tset x 5")).toBe("set x 5");
        expect(cleanLine(" \tset x 5\t ")).toBe("set x 5");
    });
});
describe("cleanLine", () => {
    it("should not modify lines that are already clean", () => {
        expect(cleanLine("set x 5")).toBe("set x 5");
        expect(cleanLine("ulocate building core true outX outY found building")).toBe("ulocate building core true outX outY found building");
    });
    it("should remove trailing and leading spaces and tabs", () => {
        expect(cleanLine("    set x 5")).toBe("set x 5");
        expect(cleanLine("set x 5  ")).toBe("set x 5");
        expect(cleanLine("\tset x 5")).toBe("set x 5");
        expect(cleanLine(" \tset x 5\t ")).toBe("set x 5");
    });
    it("should remove single line comments", () => {
        expect(cleanLine("amogus sussy //comment")).toBe("amogus sussy");
        expect(cleanLine("amogus sussy #comment")).toBe("amogus sussy");
        expect(cleanLine("//comment")).toBe("");
        expect(cleanLine("amogus sussy#//#comment")).toBe("amogus sussy");
    });
    it("should remove multiline comments", () => {
        expect(cleanLine("amogus /*COMMENT*/sus")).toBe("amogus sus");
        expect(cleanLine("amogus /*com*/sus/*ent*/ ")).toBe("amogus sus");
    });
    it("should not mess up comments inside of strings", () => {
        expect(cleanLine(`print "[#blue]amogus[]"`)).toBe(`print "[#blue]amogus[]"`);
        expect(cleanLine(`print "amo//gus"`)).toBe(`print "amo//gus"`);
        expect(cleanLine(`print "am/*og*/us"`)).toBe(`print "am/*og*/us"`);
        expect(cleanLine(`print /*"a#m*/ogus ""`)).toBe(`print ogus ""`);
    });
    it("should do everything above at once", () => {
        expect(cleanLine(`   \t say amogus /*#"a*/nd""#     \t\t  `)).toBe(`say amogus nd""`);
    });
});
describe("replaceCompilerConstants", () => {
    const sampleVars = {
        mog: "amogus",
        e: "building core true",
        err: "thingy",
        "memcellpos.mode": "5"
    };
    it("should not modify lines without compiler constants", () => {
        expect(replaceCompilerConstants(`print "x + 5 is $amogus"`, sampleVars)).toBe(`print "x + 5 is $amogus"`);
    });
    it("should replace compiler constants", () => {
        expect(replaceCompilerConstants(`print "$mog"`, sampleVars)).toBe(`print "amogus"`);
        expect(replaceCompilerConstants(`write x cell1 $memcellpos.mode`, sampleVars)).toBe(`write x cell1 5`);
        expect(replaceCompilerConstants(`print "$err"`, sampleVars)).toBe(`print "building core truerr"`);
    });
    it("should replace compiler constants when parentheses are used", () => {
        expect(replaceCompilerConstants(`print "$(mog)"`, sampleVars)).toBe(`print "amogus"`);
        expect(replaceCompilerConstants(`print "$(err)"`, sampleVars)).toBe(`print "thingy"`);
    });
});
describe("splitLineIntoArguments", () => {
    it("should split a line on space", () => {
        expect(splitLineIntoArguments("a b cd e")).toEqual(["a", "b", "cd", "e"]);
        expect(splitLineIntoArguments("ulocate building core true outX outY found building")).toEqual(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"]);
    });
    it("should not split strings", () => {
        expect(splitLineIntoArguments(`print "amogus sussy" and "a eea "`)).toEqual(["print", `"amogus sussy"`, "and", `"a eea "`]);
    });
});
describe("transformVariables", () => {
    it("should only edit variables", () => {
        expect(transformVariables(["set", "x", "5"], commands["set"][0], x => `_transformed_${x}`)).toEqual(["set", "_transformed_x", "5"]);
        expect(transformVariables(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3], x => `_transformed_${x}`)).toEqual(["ulocate", "building", "core", "true", "_transformed_outX", "_transformed_outY", "_transformed_found", "_transformed_building"]);
    });
});
describe("transformCommand", () => {
    it("should accept a custom function", () => {
        expect(transformCommand(["set", "x", "5"], commands["set"][0], x => x.toUpperCase(), (arg, commandArg) => !(commandArg?.isGeneric ?? true))).toEqual(["set", "x", "5"]);
        expect(transformCommand(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3], x => x.toUpperCase(), (arg, commandArg) => !(commandArg?.isGeneric ?? true))).toEqual(["ulocate", "BUILDING", "core", "true", "outX", "outY", "found", "building"]);
    });
});
describe("addNamespacesToVariable", () => {
    it("should add namespaces to a variable", () => {
        expect(addNamespacesToVariable("x", [{ name: "amogus", type: "namespace" }])).toEqual("_amogus_x");
        expect(addNamespacesToVariable("sussyBaka", [{ name: "amogus", type: "namespace" }, { name: "sus", type: "namespace" }])).toEqual("_amogus_sus_sussyBaka");
    });
});
describe("addNamespacesToLine", () => {
    it("should add namespaces to a statement", () => {
        expect(addNamespacesToLine(["set", "x", "5"], commands["set"][0], [{ name: "amogus", type: "namespace" }])).toEqual("set _amogus_x 5");
        expect(addNamespacesToLine(["ulocate", "building", "core", "true", "outX", "outY", "found", "core"], commands["ulocate"][3], [{ name: "amogus", type: "namespace" }])).toEqual("ulocate building core true _amogus_outX _amogus_outY _amogus_found _amogus_core");
        expect(addNamespacesToLine(["set", "x", ":number", "5"], commands["set"][1], [{ name: "amogus", type: "namespace" }, { name: "sus", type: "namespace" }])).toEqual("set _amogus_sus_x :number 5");
    });
});
describe("prependFilenameToArg", () => {
    it("should prepend filename for an arg with two underscores before it", () => {
        expect(prependFilenameToArg("__thing", false, "test.mlogx")).toEqual("__test__thing");
    });
    it("should not prepend filename for an arg without two underscores before it", () => {
        expect(prependFilenameToArg("_thing", false, "test.mlogx")).toEqual("_thing");
    });
});
describe("removeUnusedJumps", () => {
    it("should not remove used jumps", () => {
        expect(removeUnusedJumps([
            "label5:",
            "jump label5 always"
        ], {
            label5: [{
                    line: { text: "jump label5 always", lineNumber: 2 }
                }]
        })).toEqual([
            "label5:",
            "jump label5 always"
        ]);
    });
    it("should remove unused jumps", () => {
        expect(removeUnusedJumps([
            "label5:",
            "jump label5 always",
            "label6:"
        ], {
            label5: [{
                    line: { text: "jump label5 always", lineNumber: 2 }
                }]
        })).toEqual([
            "label5:",
            "jump label5 always"
        ]);
    });
});
describe("parseIcons", () => {
    it("should parse icons", () => {
        expect(parseIcons([
            `63734=craters|block-craters-ui`
        ])).toEqual({
            "_craters": String.fromCodePoint(63734)
        });
    });
});
describe("getParameters", () => {
    it("should get function parameters from a program", () => {
        expect(getParameters(["#function move_unit_precise(dest.x:number, u:unit)"]))
            .toEqual([["dest.x", "number"], ["u", "unit"]]);
        expect(getParameters(["#sussy amogus"]))
            .toEqual([]);
    });
});
describe("parsePreprocessorDirectives", () => {
    it("should parse required vars from a program", () => {
        expect(parsePreprocessorDirectives([
            `#require cookie`
        ])[1]).toEqual(["cookie"]);
        expect(parsePreprocessorDirectives([
            `#require core, thing`,
            `#sussy baka`,
            `set x false`,
            `#required that stuff be done`
        ])[1]).toEqual(["core", "thing"]);
        expect(parsePreprocessorDirectives([
            `#require cookie`
        ])[1]).toEqual(["cookie"]);
    });
    it("should parse author from a program", () => {
        expect(parsePreprocessorDirectives([
            `#author amogus`
        ])[2]).toEqual("amogus");
        expect(parsePreprocessorDirectives([
            `#author sussy baka`,
            `#sussy baka`,
            `set x false`,
            `#required that stuff be done`
        ])[2]).toEqual("sussy baka");
    });
    it("should parse program type from a program", () => {
        expect(parsePreprocessorDirectives([
            `#program_type main`
        ])[0]).toEqual("main");
        expect(parsePreprocessorDirectives([
            `#sussy baka`,
            `#program_type main`,
            `set x false`,
            `#required that stuff be done`
        ])[0]).toEqual("main");
    });
});
describe("getVariablesDefined", () => {
    it("should get variables defined in statements", () => {
        expect(getVariablesDefined(["x", "cell1", "4"], commands["read"][0])).toEqual([["x", "number"]]);
        expect(getVariablesDefined(["building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3]))
            .toEqual([["outX", "number"], ["outY", "number"], ["found", "boolean"], ["building", "building"]]);
    });
    it("should infer type in a set statement", () => {
        expect(getVariablesDefined(["core", "nucleus1"], commands["set"][0])).toEqual([["core", "building"]]);
        expect(getVariablesDefined(["amogus", `"sus"`], commands["set"][0])).toEqual([["amogus", "string"]]);
    });
    it("should accept type hints in a set statement", () => {
        expect(getVariablesDefined(["thing", "null"], commands["set"][0], ["thing", ":building", "null"], commands["set"][1])).toEqual([["thing", "building"]]);
        expect(getVariablesDefined(["amogus", `otherVar`], commands["set"][0], ["amogus", ":number", `otherVar`], commands["set"][1])).toEqual([["amogus", "number"]]);
    });
    it("should fail on invalid set statement type hints", () => {
        expect(() => {
            getVariablesDefined(["amogus", `otherVar`], commands["set"][0], ["amogus", ":sus", `otherVar`], commands["set"][1]);
        }).toThrow();
    });
});
describe("getVariablesUsed", () => {
    it("should get variables used by a statement", () => {
        expect(getVariablesUsed(["x", "cell1", "y"], commands["read"][0])).toEqual([["y", "number"]]);
        expect(getVariablesUsed(["building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3]))
            .toEqual([]);
    });
});
describe("getAllPossibleVariablesUsed", () => {
    it("should get variables used by a statement", () => {
        expect(getAllPossibleVariablesUsed("read x cell1 y")).toEqual([["y", ["number"]]]);
        expect(getAllPossibleVariablesUsed("ucontrol within x y 10 close"))
            .toEqual([["x", ["number"]], ["y", ["number"]]]);
        expect(getAllPossibleVariablesUsed("ulocate building core true outX outY found building"))
            .toEqual([]);
    });
    it("should return multiple possible types for certain commands", () => {
        expect(getAllPossibleVariablesUsed("sensor x thing @x"))
            .toEqual([["thing", ["building", "unit"]]]);
    });
    it("should work for commands that replace", () => {
        expect(getAllPossibleVariablesUsed("sensor building.x building @x", "sensor building.x"))
            .toEqual([["building", ["building", "unit"]]]);
    });
});
describe("getJumpLabelUsed", () => {
    it("should get the jump label used", () => {
        expect(getJumpLabelUsed("jump label always")).toEqual("label");
    });
    it("should return null if no jump label exists", () => {
        expect(getJumpLabelUsed("set label \"greaterThan\"")).toEqual(null);
    });
});
describe("getJumpLabel", () => {
    it("should get the jump label defined", () => {
        expect(getJumpLabel("label:")).toEqual("label");
    });
    it("should return null if no jump label exists", () => {
        expect(getJumpLabel("jump label greaterThan x 5")).toEqual(null);
    });
});
describe("inForLoop", () => {
    it("should return whether or not the stack contains an &for loop", () => {
        expect(inForLoop([
            { name: "amogus", type: "namespace" }, { name: "sus", type: "namespace" }
        ])).toEqual(false);
        expect(inForLoop([])).toEqual(false);
        expect(inForLoop([
            { name: "amogus", type: "namespace" }, { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" }
        ])).toEqual(true);
        expect(inForLoop([
            { name: "amogus", type: "namespace" },
            { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" },
            { type: "&for", loopBuffer: [], lowerBound: 3, upperBound: 10, variableName: "J" }
        ])).toEqual(true);
    });
});
describe("topForLoop", () => {
    it("should return the topmost &for loop on the stack", () => {
        expect(topForLoop([
            { name: "amogus", type: "namespace" }, { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" }
        ])).toEqual({ type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" });
        expect(topForLoop([
            { name: "amogus", type: "namespace" },
            { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" },
            { type: "&for", loopBuffer: [], lowerBound: 3, upperBound: 10, variableName: "J" }
        ])).toEqual({ type: "&for", loopBuffer: [], lowerBound: 3, upperBound: 10, variableName: "J" });
    });
    it("should return null when no &for loop is on the stack", () => {
        expect(topForLoop([
            { name: "amogus", type: "namespace" }
        ])).toEqual(null);
    });
});
describe("inNamespace", () => {
    it("should return whether or not the stack contains a namespace", () => {
        expect(inNamespace([
            { name: "amogus", type: "namespace" }, { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" }
        ])).toEqual(true);
        expect(inNamespace([
            { type: "&for", loopBuffer: [], lowerBound: 0, upperBound: 5, variableName: "I" },
            { type: "&for", loopBuffer: [], lowerBound: 3, upperBound: 10, variableName: "J" }
        ])).toEqual(false);
        expect(inNamespace([])).toEqual(false);
    });
});
describe("getCommandDefinitions", () => {
    it("should get all valid command definitions for a command", () => {
        expect(getCommandDefinitions(`read x cell1 4`)).toEqual([
            commands.read[0]
        ]);
        expect(getCommandDefinitions(`ulocate building core true outX outY found core`)).toEqual([
            commands.ulocate[3]
        ]);
        expect(getCommandDefinitions(`sensor x thing @x`)).toEqual([
            commands.sensor[0], commands.sensor[1]
        ]);
        expect(getCommandDefinitions(`print x`)).toEqual([
            commands.print[0]
        ]);
    });
    it("should return empty if no valid definitions", () => {
        expect(getCommandDefinitions(`print sussy baka`)).toEqual([]);
        expect(getCommandDefinitions(`drawflush 5`)).toEqual([]);
        expect(getCommandDefinitions(`ulocate ore @this outX outY found`)).toEqual([]);
    });
});
describe("getCommandDefinition", () => {
    it("should get the first valid command definition for a command", () => {
        expect(getCommandDefinition(`read x cell1 4`))
            .toEqual(commands.read[0]);
        expect(getCommandDefinition(`ulocate building core true outX outY found core`))
            .toEqual(commands.ulocate[3]);
    });
});
describe("isCommand", () => {
    it("should check if a command is valid for a command definition", () => {
        expect(isCommand(`set x 5`, commands.set[0]))
            .toEqual([true, null]);
        expect(isCommand(`set x :number 5`, commands.set[1]))
            .toEqual([true, null]);
        expect(isCommand(`set x 5`, commands.set[1])[0])
            .toEqual(false);
        expect(isCommand(`set x :number 5`, commands.set[0])[0])
            .toEqual(false);
    });
});
describe("areAnyOfInputsCompatibleWithType", () => {
    it("should return true if types are the same", () => {
        expect(areAnyOfInputsCompatibleWithType(["number"], "number")).toEqual(true);
        expect(areAnyOfInputsCompatibleWithType(["building", "type", "number"], "number")).toEqual(true);
    });
    it("should return true if types are compatible", () => {
        expect(areAnyOfInputsCompatibleWithType(["boolean"], "number")).toEqual(true);
        expect(areAnyOfInputsCompatibleWithType(["any", "operandTest"], "number")).toEqual(true);
    });
    it("should return false if types are incompatible", () => {
        expect(areAnyOfInputsCompatibleWithType(["building", "type"], "number")).toEqual(false);
    });
});
describe("typesAreCompatible", () => {
    it("should return true if types are the same", () => {
        expect(typesAreCompatible("number", "number")).toEqual(true);
        expect(typesAreCompatible("operandSingle", "operandSingle")).toEqual(true);
    });
    it("should return true if types are compatible", () => {
        expect(typesAreCompatible("number", "boolean")).toEqual(true);
        expect(typesAreCompatible("any", "jumpAddress")).toEqual(true);
        expect(typesAreCompatible("any", "unit")).toEqual(true);
    });
    it("should return false if types are incompatible", () => {
        expect(typesAreCompatible("number", "string")).toEqual(false);
        expect(typesAreCompatible("operandSingle", "ctype")).toEqual(false);
    });
});
describe("acceptsVariable", () => {
    it("should determine if an Arg accepts a variable as an input", () => {
        expect(acceptsVariable(new Arg("unit", "target", true, true, false)))
            .toEqual(true);
        expect(acceptsVariable(new Arg("number", "target", true, true, false)))
            .toEqual(true);
        expect(acceptsVariable(new Arg("unit", "target", true, true, true)))
            .toEqual(false);
        expect(acceptsVariable(new Arg("buildingGroup", "thing", true, true, false)))
            .toEqual(false);
        expect(acceptsVariable(new Arg("ctype", "thing", true, true, false)))
            .toEqual(false);
        expect(acceptsVariable(new Arg("unitSortCriteria", "thing", true, true, false)))
            .toEqual(false);
    });
});
describe("processCommands", () => {
    it("should process the commands ast", () => {
        expect(processCommands({
            "amogus": [{
                    args: "sus susLevel:number",
                    description: "Sets the suslevel of the imposter."
                }],
            "sus": [
                {
                    args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
                    description: "is sus.",
                    replace: ["sus building %2 %3 _ %4 %5 %6 %7"]
                },
                {
                    args: "",
                    description: "Does nothing."
                }
            ],
        }))
            .toEqual({
            "amogus": [{
                    args: [new Arg("sus", "sus", false, false, false), new Arg("number", "susLevel", false, true, false)],
                    description: "Sets the suslevel of the imposter.",
                    name: "amogus",
                    getVariablesDefined: undefined,
                    getVariablesUsed: undefined,
                }],
            "sus": [
                {
                    name: "sus",
                    description: "is sus.",
                    args: [
                        new Arg("building", "building", false, false, false),
                        new Arg("buildingGroup", "buildingGroup", false, true, false),
                        new Arg("boolean", "enemy", false, true, false),
                        new Arg("number", "outX", false, true, true),
                        new Arg("number", "outY", false, true, true),
                        new Arg("boolean", "found", false, true, true),
                        new Arg("building", "building", false, true, true),
                    ],
                    getVariablesDefined: undefined,
                    getVariablesUsed: undefined,
                    replace: jasmine.any(Function)
                },
                {
                    args: [],
                    description: "Does nothing.",
                    name: "sus",
                    getVariablesDefined: undefined,
                    getVariablesUsed: undefined,
                }
            ]
        });
    });
});
describe("addSourcesToCode", () => {
    it("should add sources to code", () => {
        expect(addSourcesToCode([
            `print "hello"`,
            `printflush message1`,
            `//sussy baka`
        ], {
            lineNumber: 69,
            text: `print "hello"`
        })).toEqual([
            [`print "hello"`, { lineNumber: 69, text: `print "hello"` }],
            [`printflush message1`, { lineNumber: 69, text: `print "hello"` }],
            [`//sussy baka`, { lineNumber: 69, text: `print "hello"` }],
        ]);
    });
});
