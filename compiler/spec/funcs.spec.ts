/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.
*/


import { Arg } from "../src/classes.js";
import commands from "../src/commands.js";
import { GenericArgs } from "../src/consts.js";
import {
	processCommands, addNamespacesToLine, getAllPossibleVariablesUsed, getJumpLabelUsed,
	getParameters, getVariablesUsed, isArgValidForType, removeUnusedJumps, replaceCompilerConstants,
	splitLineIntoArguments, transformCommand, transformVariables, getVariablesDefined,
	cleanLine, isGenericArg, typeofArg, parseIcons, addNamespacesToVariable,
	prependFilenameToArg, getJumpLabel, topForLoop, parsePreprocessorDirectives,
	hasElement, getCommandDefinitions, getCommandDefinition, areAnyOfInputsCompatibleWithType,
	isCommand, typesAreCompatible, acceptsVariable, addSourcesToCode, range, arg, formatLine,
	formatLineWithPrefix, getCompilerCommandDefinitions, getCompilerConsts, hasDisabledIf,
	processCompilerCommands, removeComments, removeTrailingSpaces, isArgValidFor
} from "../src/funcs.js";
import { ArgType, CompilerConst } from "../src/types.js";
import { makeForEl, makeIfEl, makeNamespaceEl } from "./test_utils.js";


describe("templateFunction", () => {
	it("should ", () => {
		expect("functionThing").toEqual("functionThing");
	});
});

//#region argFunctions

describe("isGenericArg", () => {
	it("should determine if an arg is generic", () => {
		for(const genericArg of Object.keys(GenericArgs)){
			expect(isGenericArg(genericArg)).toBe(true);
		}
	});
});

describe("typeofArg", () => {
	it("should determine the type of an arg", () => {
		const args: [arg:string, expectedType:string][] = [
			["@unit", "unit"],
			["@thisx", "number"],
			["@this", "building"],
			["greaterThanEq", "operandTest"],
			["-50.2", "number"],
			[`"amogus"`, "string"],
			[`:number`, "ctype"],
		];
		for(const [arg, expectedOutput] of args){
			expect(typeofArg(arg)).withContext(`${arg} should be of type ${expectedOutput}`).toBe(expectedOutput);
		}
	});
});

describe("isArgValidForType", () => {
	it("should determine if an arg is of specified type", () => {
		const correctTypes: [arg:string, expectedType:ArgType][] = [
			["@unit", "unit"],
			["@thisx", "number"],
			["@this", "building"],
			["greaterThanEq", "operandTest"],
			["-50.2", "number"],
			[`"amogus"`, "string"],
			["sussyFlarogus", "unit"],
			[`:number`, "ctype"],
			[`add`, "operandDouble"],
			[`cos`, "operandSingle"],
		];
		for(const [arg, expectedType] of correctTypes){
			expect(isArgValidForType(arg, expectedType)).withContext(`${arg} should be of type ${expectedType}`).toBe(true);
		}
	});
	it("should determine if an arg is not of specified type", () => {
		const wrongTypes: [arg:string, expectedType:ArgType][] = [
			["@unit", "building"],
			["@thisx", "operandTest"],
			["@this", "string"],
			["greaterThanEq", "buildingGroup"],
			["-50.2", "unit"],
			[`"amogus"`, "number"],
			[`:number`, "variable"],
		];
		for(const [arg, unexpectedType] of wrongTypes){
			expect(isArgValidForType(arg, unexpectedType)).withContext(`${arg} should not be of type ${unexpectedType}`).toBe(false);
		}
	});
});

describe("isArgValidFor", () => {
	it("should determine if an arg is valid for Arg", () => {
		const correctTypes: [arg:string, expectedType:ArgType][] = [
			["@unit", "unit"],
			["@thisx", "number"],
			["@this", "building"],
			["greaterThanEq", "operandTest"],
			["-50.2", "number"],
			[`"amogus"`, "string"],
			["sussyFlarogus", "unit"],
			[`:number`, "ctype"],
			[`add`, "operandDouble"],
			[`cos`, "operandSingle"],
		];
		for(const [arg, expectedType] of correctTypes){
			expect(isArgValidFor(arg, new Arg(expectedType))).toBe(true);
		}
		expect(isArgValidFor("amogus", new Arg("amogus"))).toBe(true);
		expect(isArgValidFor("x", new Arg("number"))).toBe(true);
	});
	it("should determine if an arg is not of specified type", () => {
		const wrongTypes: [arg:string, expectedType:ArgType][] = [
			["@unit", "building"],
			["@thisx", "operandTest"],
			["@this", "string"],
			["greaterThanEq", "buildingGroup"],
			["-50.2", "unit"],
			[`"amogus"`, "number"],
			[`:number`, "variable"],
		];
		for(const [arg, unexpectedType] of wrongTypes){
			expect(isArgValidFor(arg, new Arg(unexpectedType))).toBe(false);
		}
		expect(isArgValidFor("amogus", new Arg("sus"))).toBe(false);
		expect(isArgValidFor("x", new Arg("operandTest"))).toBe(false);
	});
});

//#endregion
//#region lineManipulation

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
		//todo make this MORE COMPLICATED
		expect(cleanLine(`   \t say amogus /*#"a*/nd""#     \t\t  `)).toBe(`say amogus nd""`);
	});
});

describe("replaceCompilerConstants", () => {
	const sampleVars = new Map<string, CompilerConst>([
		["mog", "amogus"],
		["e", "building core true"],
		["err", "thingy"],
		["memcellpos.mode", "5"],
		["number", 50.2],
		["boolean", true],
		["array", [50.2, true, "e"]],
	]);
	it("should not modify lines without compiler constants", () => {
		expect(replaceCompilerConstants(`print "x + 5 is $amogus"`, sampleVars)).toBe(`print "x + 5 is $amogus"`);
	});
	it("should replace compiler constants", () => {
		expect(replaceCompilerConstants(`print "$mog"`, sampleVars)).toBe(`print "amogus"`);
		expect(replaceCompilerConstants(`write x cell1 $memcellpos.mode`, sampleVars)).toBe(`write x cell1 5`);
		expect(replaceCompilerConstants(`print "$err"`, sampleVars)).toBe(`print "building core truerr"`);
	});
	it("should replace non-string compiler consts", () => {
		expect(replaceCompilerConstants(`print $number`, sampleVars)).toBe(`print 50.2`);
		expect(replaceCompilerConstants(`print $boolean`, sampleVars)).toBe(`print true`);
		expect(replaceCompilerConstants(`print "$array"`, sampleVars)).toBe(`print "50.2 true e"`);
	});
	it("should replace compiler constants when parentheses are used", () => {
		expect(replaceCompilerConstants(`print "$(mog)"`, sampleVars)).toBe(`print "amogus"`);
		expect(replaceCompilerConstants(`print "$(err)"`, sampleVars)).toBe(`print "thingy"`);
		expect(replaceCompilerConstants(`print "$(e)rr"`, sampleVars)).toBe(`print "building core truerr"`);
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

//#endregion
//#region argBasedLineManipulation

describe("transformVariables", () => {
	it("should only edit variables", () => {
		expect(transformVariables(["set", "x", "5"], commands["set"][0], x => `_transformed_${x}`)).toEqual(["set", "_transformed_x", "5"]);
		expect(transformVariables(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3], x => `_transformed_${x}`)).toEqual(["ulocate", "building", "core", "true", "_transformed_outX", "_transformed_outY", "_transformed_found", "_transformed_building"]);
	});
});

describe("transformCommand", () => {
	it("should accept a custom function", () => {
		expect(transformCommand(
			["set", "x", "5"],
			commands["set"][0],
			x => x.toUpperCase(),
			(arg, commandArg) => !(commandArg?.isGeneric ?? true))
		).toEqual(["set", "x", "5"]);
		expect(transformCommand(
			["ulocate", "building", "core", "true", "outX", "outY", "found", "building"],
			commands["ulocate"][3],
			x => x.toUpperCase(),
			(arg, commandArg) => !(commandArg?.isGeneric ?? true))
		).toEqual(["ulocate", "BUILDING", "core", "true", "outX", "outY", "found", "building"]);
	});
});

describe("addNamespacesToVariable", () => {
	it("should add namespaces to a variable", () => {
		expect(addNamespacesToVariable(
			"x",
			[makeNamespaceEl("amogus")]
		)).toEqual("_amogus_x");
		expect(addNamespacesToVariable(
			"sussyBaka",
			[makeNamespaceEl("amogus"), makeNamespaceEl("sus")]
		)).toEqual("_amogus_sus_sussyBaka");
	});
});

describe("addNamespacesToLine", () => {
	it("should add namespaces to a statement", () => {
		expect(addNamespacesToLine(
			["set", "x", "5"],
			commands["set"][0],
			[makeNamespaceEl("amogus")]
		)).toEqual("set _amogus_x 5");
		expect(addNamespacesToLine(
			["ulocate", "building", "core", "true", "outX", "outY", "found", "core"],
			commands["ulocate"][3],
			[makeNamespaceEl("amogus")]
		)).toEqual("ulocate building core true _amogus_outX _amogus_outY _amogus_found _amogus_core");
		expect(addNamespacesToLine(
			["set", "x", ":number", "5"],
			commands["set"][1],
			[makeNamespaceEl("amogus"), makeNamespaceEl("sus")]
		)).toEqual("set _amogus_sus_x :number 5");
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
				line: {text: "jump label5 always", lineNumber: 2}
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
				line: {text: "jump label5 always", lineNumber: 2}
			}]
		})).toEqual([
			"label5:",
			"jump label5 always"
		]);
	});
});

//#endregion
//#region parsing

describe("parseIcons", () => {
	it("should parse icons", () => {
		expect(parseIcons([
			`63734=craters|block-craters-ui`
		]).get("_craters")).toEqual(
			String.fromCodePoint(63734)
		);
	});
});

describe("getParameters", () => {
	it("should get function parameters from a program", () => {
		expect(getParameters(["#function move_unit_precise(dest.x:number, u:unit)"]))
			.toEqual([["dest.x", "number"], ["u", "unit"]]);
		expect(getParameters(["#sussy amogus"]))
			.toEqual([]);
		//TODO add more
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

//#endregion
//#region typeReading

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
		expect(getVariablesDefined(
			["thing", "null"], commands["set"][0],
			["thing", ":building", "null"], commands["set"][1])
		).toEqual([["thing", "building"]]);
		expect(getVariablesDefined(
			["amogus", `otherVar`], commands["set"][0],
			["amogus", ":number", `otherVar`], commands["set"][1]
		)).toEqual([["amogus", "number"]]);
	});
	it("should fail on invalid set statement type hints", () => {
		expect(() => {
			getVariablesDefined(
				["amogus", `otherVar`], commands["set"][0],
				["amogus", ":sus", `otherVar`], commands["set"][1]
			);
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

//#endregion
//#region stack

describe("hasElement", () => {
	it("should return whether or not the stack contains an &for loop", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeNamespaceEl("sus")
		], "&for")).toEqual(false);
		expect(hasElement([], "&for")).toEqual(false);
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		], "&for")).toEqual(true);
		expect(hasElement([
			makeNamespaceEl("amogus"),
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "&for")).toEqual(true);
	});
	it("should return whether or not the stack contains a namespace", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		], "namespace")).toEqual(true);
		expect(hasElement([
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "namespace")).toEqual(false);
		expect(hasElement([], "namespace")).toEqual(false);
	});
	it("should return whether or not the stack contains an if statement", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true)), makeIfEl(false)
		], "&if")).toEqual(true);
		expect(hasElement([
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "&if")).toEqual(false);
		expect(hasElement([], "&if")).toEqual(false);
	});
});

describe("topForLoop", () => {
	it("should return the topmost &for loop on the stack", () => {
		expect(topForLoop([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		])).toEqual(makeForEl("I", range(0, 5, true)));
		expect(topForLoop([
			makeNamespaceEl("amogus"),
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		])).toEqual(makeForEl("J", range(3, 10, true)));
	});
	it("should return null when no &for loop is on the stack", () => {
		expect(topForLoop([
			makeNamespaceEl("amogus")
		])).toEqual(null);
	});
});

//#endregion
//#region commandChecking

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
		expect(getCommandDefinitions(`jump label always`, true)).toEqual([
			[commands.jump[0]],
			[jasmine.any(Object), jasmine.any(Object)]
		]);
	});
	//TODO add more
	it("should return empty if no valid definitions", () => {
		expect(getCommandDefinitions(`amogus`)).toEqual([]);
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
		//TODO add more
	});
});

//#endregion
//#region typeChecking
describe("areAnyOfInputsCompatibleWithType", () => {
	it("should return true if types are the same", () => {
		expect(
			areAnyOfInputsCompatibleWithType(["number"], "number")
		).toEqual(true);
		expect(
			areAnyOfInputsCompatibleWithType(["building", "type", "number"], "number")
		).toEqual(true);
	});
	it("should return true if types are compatible", () => {
		expect(
			areAnyOfInputsCompatibleWithType(["boolean"], "number")
		).toEqual(true);
		expect(
			areAnyOfInputsCompatibleWithType(["any", "operandTest"], "number")
		).toEqual(true);
	});
	it("should return false if types are incompatible", () => {
		expect(
			areAnyOfInputsCompatibleWithType(["building", "type"], "number")
		).toEqual(false);
	});
});
describe("typesAreCompatible", () => {
	it("should return true if types are the same", () => {
		expect(
			typesAreCompatible("number", "number")
		).toEqual(true);
		expect(
			typesAreCompatible("operandSingle", "operandSingle")
		).toEqual(true);
	});
	it("should return true if types are compatible", () => {
		expect(
			typesAreCompatible("number", "boolean")
		).toEqual(true);
		expect(
			typesAreCompatible("any", "jumpAddress")
		).toEqual(true);
		expect(
			typesAreCompatible("any", "unit")
		).toEqual(true);
	});
	it("should return false if types are incompatible", () => {
		expect(
			typesAreCompatible("number", "string")
		).toEqual(false);
		expect(
			typesAreCompatible("operandSingle", "ctype")
		).toEqual(false);
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

//#endregion
//#region misc

describe("arg", () => {
	it("should parse generic args", () => {
		expect(arg(`amogus`)).toEqual(new Arg("amogus", "amogus", false, false, false, false));
	});
	it("should parse args with types", () => {
		expect(arg(`amogus:number`)).toEqual(new Arg("number", "amogus", false, true, false, false));
	});
	it("should parse optional args", () => {
		expect(arg(`amogus:string?`)).toEqual(new Arg("string", "amogus", true, true, false, false));
	});
	it("should parse variable output args", () => {
		expect(arg(`amogus:*number`)).toEqual(new Arg("number", "amogus", false, true, true, false));
	});
	it("should parse spread args", () => {
		expect(arg(`...amogus:number`)).toEqual(new Arg("number", "amogus", false, true, false, true));
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
					replace: ["sus building %2 %3 _ %4 %5 %6 %7"],
					port(args, mode) {
						return args.join(" ");
					},
				},{
					args: "",
					description: "Does nothing."
				}
			],
		})).toEqual({
			"amogus": [{
				type: "Command",
				args: [new Arg("sus", "sus", false, false, false), new Arg("number", "susLevel", false, true, false)],
				description: "Sets the suslevel of the imposter.",
				name: "amogus",
				getVariablesDefined: undefined,
				getVariablesUsed: undefined,
				port: undefined
			}],
			"sus": [
				{
					type: "Command",
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
					replace: jasmine.any(Function),
					port: jasmine.any(Function)
				},{
					type: "Command",
					args: [],
					description: "Does nothing.",
					name: "sus",
					getVariablesDefined: undefined,
					getVariablesUsed: undefined,
					port: undefined
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

//#endregion
