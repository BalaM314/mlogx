import { isGenericArg, typeofArg } from "../funcs";
import { GenericArgType } from "../types";


test("isGenericArg should determine if an arg is generic", () => {
	for(let genericArg of Object.values(GenericArgType)){
		expect(isGenericArg(genericArg)).toBe(true);
	}
});

test("typeofArg should determine the type of an arg", () => {
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

