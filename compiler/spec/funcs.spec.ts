import { isArgOfType } from "../funcs.js";
import { getVariablesDefined } from "../funcs.js";
import { cleanLine } from "../funcs.js";
import { isGenericArg, typeofArg } from "../funcs.js";
import { GenericArgType } from "../types.js";



describe("isGenericArg", () => {
	it("should determine if an arg is generic", () => {
		for(let genericArg of Object.values(GenericArgType)){
			expect(isGenericArg(genericArg)).toBe(true);
		}
	});
});

describe("typeofArg", () => {
	it("should determine the type of an arg", () => {
		const args: [arg:string, expectedType:string][] = [
			["@unit", GenericArgType.unit],
			["@thisx", GenericArgType.number],
			["@this", GenericArgType.building],
			["greaterThanEq", GenericArgType.operandTest],
			["-50.2", GenericArgType.number],
			[`"amogus"`, GenericArgType.string]
		];
		for(let [arg, expectedOutput] of args){
			expect(typeofArg(arg)).toBe(expectedOutput);
		}
	});
});

describe("isArgOfType", () => {
	it("should determine if an arg is of specified type", () => {
		const correctTypes: [arg:string, expectedType:GenericArgType][] = [
			["@unit", GenericArgType.unit],
			["@thisx", GenericArgType.number],
			["@this", GenericArgType.building],
			["greaterThanEq", GenericArgType.operandTest],
			["-50.2", GenericArgType.number],
			[`"amogus"`, GenericArgType.string],
			["sussyFlarogus", GenericArgType.unit]
		];
		const wrongTypes: [arg:string, expectedType:GenericArgType][] = [
			["@unit", GenericArgType.building],
			["@thisx", GenericArgType.operandTest],
			["@this", GenericArgType.string],
			["greaterThanEq", GenericArgType.buildingGroup],
			["-50.2", GenericArgType.unit],
			[`"amogus"`, GenericArgType.number],
		];
		for(let [arg, expectedType] of correctTypes){
			expect(isArgOfType(arg, expectedType)).toBe(true);
		}
		for(let [arg, unexpectedType] of correctTypes){
			expect(isArgOfType(arg, unexpectedType)).toBe(false);
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
	it("should remove single line comments", () => {});
	it("should remove multiline comments", () => {});
	it("should not mess up comments inside of strings", () => {});
	it("should do everything above at once", () => {});
})


describe("getVariablesDefined", () => {
	it("should get variables defined in statements", () => {
		expect(getVariablesDefined(["read", "x", "cell1", "4"], commands["read"][0])).toEqual(["x", "number"]);
		expect(getVariablesDefined(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][4]))
	});
	it("should infer type in a set statement", () => {
		expect(getVariablesDefined(["set", "core", "nucleus1"], commands["set"][0])).toEqual(["core", "building"]);
	});
});