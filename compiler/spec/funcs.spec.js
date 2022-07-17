import { Arg } from "../classes.js";
import commands from "../commands.js";
import { addNamespacesToLine, getAllPossibleVariablesUsed, getJumpLabelUsed, getParameters, getVariablesUsed, isArgOfType, removeUnusedJumps, replaceCompilerConstants, splitLineIntoArguments, transformCommand, transformVariables } from "../funcs.js";
import { getVariablesDefined } from "../funcs.js";
import { cleanLine } from "../funcs.js";
import { isGenericArg, typeofArg } from "../funcs.js";
import { GAT } from "../types.js";
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
describe("getParameters", () => {
    it("should get function parameters from a program", () => {
        expect(getParameters(["#function move_unit_precise(dest.x:number, u:unit)"]))
            .toEqual([["dest.x", "number"], ["u", "unit"]]);
        expect(getParameters(["#sussy amogus"]))
            .toEqual([]);
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
describe("addNamespacesToLine", () => {
    it("should add namespaces to a statement", () => {
        expect(addNamespacesToLine(["set", "x", "5"], commands["set"][0], [{ name: "amogus", type: "namespace" }])).toEqual("set _amogus_x 5");
        expect(addNamespacesToLine(["ulocate", "building", "core", "true", "outX", "outY", "found", "core"], commands["ulocate"][3], [{ name: "amogus", type: "namespace" }])).toEqual("ulocate building core true _amogus_outX _amogus_outY _amogus_found _amogus_core");
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
