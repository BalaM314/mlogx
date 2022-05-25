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
		const args = [
			["@unit", GenericArgType.unit],
			["@thisx", GenericArgType.number],
			["@this", GenericArgType.building],
			["greaterThanEq", GenericArgType.operandTest],
			["-50.2", GenericArgType.number]
		];
		for(let [arg, expectedOutput] of args){
			expect(typeofArg(arg)).toBe(expectedOutput);
		}
	});
});

