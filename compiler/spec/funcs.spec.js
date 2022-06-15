import { Arg } from "../classes.js";
import commands from "../commands.js";
import { addNamespacesToLine, getParameters, isArgOfType, replaceCompilerVariables, splitLineIntoArguments, transformCommand, transformVariables } from "../funcs.js";
import { getVariablesDefined } from "../funcs.js";
import { cleanLine } from "../funcs.js";
import { isGenericArg, typeofArg } from "../funcs.js";
import { GenericArgType } from "../types.js";
describe("isGenericArg", () => {
    it("should determine if an arg is generic", () => {
        for (let genericArg of Object.values(GenericArgType)) {
            expect(isGenericArg(genericArg)).toBe(true);
        }
    });
});
describe("typeofArg", () => {
    it("should determine the type of an arg", () => {
        const args = [
            ["@unit", GenericArgType.unit],
            ["@thisx", GenericArgType.number],
            ["@this", GenericArgType.building],
            ["greaterThanEq", GenericArgType.operandTest],
            ["-50.2", GenericArgType.number],
            [`"amogus"`, GenericArgType.string]
        ];
        for (let [arg, expectedOutput] of args) {
            expect(typeofArg(arg)).toBe(expectedOutput);
        }
    });
});
describe("isArgOfType", () => {
    it("should determine if an arg is of specified type", () => {
        const correctTypes = [
            ["@unit", GenericArgType.unit],
            ["@thisx", GenericArgType.number],
            ["@this", GenericArgType.building],
            ["greaterThanEq", GenericArgType.operandTest],
            ["-50.2", GenericArgType.number],
            [`"amogus"`, GenericArgType.string],
            ["sussyFlarogus", GenericArgType.unit]
        ];
        const wrongTypes = [
            ["@unit", GenericArgType.building],
            ["@thisx", GenericArgType.operandTest],
            ["@this", GenericArgType.string],
            ["greaterThanEq", GenericArgType.buildingGroup],
            ["-50.2", GenericArgType.unit],
            [`"amogus"`, GenericArgType.number],
        ];
        for (let [arg, expectedType] of correctTypes) {
            expect(isArgOfType(arg, new Arg(expectedType))).toBe(true);
        }
        for (let [arg, unexpectedType] of wrongTypes) {
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
describe("replaceCompilerVariables", () => {
    const sampleVars = {
        mog: "amogus",
        e: "building core true"
    };
    it("should not modify lines without compiler variables", () => {
        expect(replaceCompilerVariables(`print "x + 5 is $amogus"`, sampleVars)).toBe(`print "x + 5 is $amogus"`);
    });
    it("should replace compiler variables", () => {
        expect(replaceCompilerVariables(`print "$mog"`, sampleVars)).toBe(`print "amogus"`);
    });
});
describe("getParameters", () => {
    it("should get function parameters from a program", () => {
        expect(getParameters(["#function move_unit_precise(dest.x:number, u:unit)"]))
            .toEqual([["dest.x", "number"], ["u", "unit"]]);
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
        expect(addNamespacesToLine(["set", "x", "5"], commands["set"][0], ["amogus"])).toEqual(["set", "_amogus_x", "5"]);
        expect(addNamespacesToLine(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3], ["amogus"])).toEqual(["ulocate", "BUILDING", "core", "true", "outX", "outY", "found", "building"]);
    });
});
describe("getVariablesDefined", () => {
    it("should get variables defined in statements", () => {
        expect(getVariablesDefined(["read", "x", "cell1", "4"], commands["read"][0])).toEqual([["x", "number"]]);
        expect(getVariablesDefined(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][4]));
    });
    it("should infer type in a set statement", () => {
        expect(getVariablesDefined(["set", "core", "nucleus1"], commands["set"][0])).toEqual([["core", "building"]]);
    });
});
