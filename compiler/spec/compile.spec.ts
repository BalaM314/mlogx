/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains tests related to compilation.
*/



import { compilerCommands } from "../src/commands.js";
import { addJumpLabels, compileLine, compileMlogxToMlog } from "../src/compile.js";
import { range } from "../src/funcs.js";
import { Log } from "../src/Log.js";
import { Settings, settingsSchema } from "../src/settings.js";
import { ForStackElement, StackElement } from "../src/stack_elements.js";
import {
	addLabelsTests,
	allMlogCommands, allMlogxCommands, allShorthandCommands, namespaceTests, startNamespace,
	testPrograms
} from "./samplePrograms.js";
import { makeForEl, makeIfEl, makeLine, makeNamespaceEl, anyLine } from "./test_utils.js";


Log.throwWarnAndErr = true;

function settingsForFilename(name:string, checkTypes:boolean = false): Settings {
	return settingsSchema.validateSync({
		filename: name,
		compilerOptions: {
			compileWithErrors: false,
			checkTypes,
			removeUnusedJumpLabels: true
		}
	}) as Settings;
}

describe("compileLine", () => {
	it("should not change any mlog commands", () => {
		for (const line of allMlogCommands) {
			expect(
				compileLine(makeLine(line), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])
			).toEqual([line]);
		}
	});

	it("should mark all mlogx commands as valid", () => {
		for (const line of allMlogxCommands) {
			expect(() =>
				compileLine(makeLine(line), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])
			).not.toThrow();
		}
	});

	it("should process all shorthands", () => {
		for(const [input, output] of allShorthandCommands){
			expect(
				compileLine(makeLine(input), new Map(), settingsForFilename("sample1.mlogx"), false, []).compiledCode.map(line => line[0])
			).toEqual([output]);
		}
	});

	it("should detect the start of a namespace", () => {
		expect(
			compileLine(makeLine(startNamespace), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack
		).toEqual([makeNamespaceEl("testname")]);
	});

	it("should detect the end of a namespace", () => {
		expect(
			compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, [makeNamespaceEl("testname")]).modifiedStack
		).toEqual([]);
	});

	it("should prepend namespaces", () => {
		for(const [input, stack, output] of namespaceTests){
			expect(
				compileLine(makeLine(input), new Map(), settingsForFilename("sample1.mlogx"), false, stack).compiledCode.map(line => line[0])
			).toEqual([output]);
		}
	});

	it("should detect the start of an &for in loop", () => {
		expect(
			compileLine(makeLine(`&for i in 0 5 {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack
		).toEqual([{
			type: "&for",
			commandDefinition: compilerCommands["&for"].overloads[0],
			elements: range(0, 5, true),
			variableName: "i",
			loopBuffer: [],
			line: anyLine
		}]);
	});

	it("should detect the start of an &for of loop", () => {
		expect(
			compileLine(makeLine(`&for i of c d e {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack
		).toEqual([
			{
				type: "&for",
				commandDefinition: compilerCommands["&for"].overloads[1],
				elements: ["c", "d", "e"],
				variableName: "i",
				loopBuffer: [],
				line: anyLine
			}
		]);
	});

	it("should detect the end of an &for loop", () => {
		expect(
			compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, [
				makeForEl("n", range(1, 3, true), [`set x 5`, `print "n is $n"`])
			]).modifiedStack
		).toEqual([]);
	});

	it("should unroll an &for loop", () => {
		expect(
			compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, [
				makeForEl("n", ["32", "53", "60"], [`set x 5`, `print "n is $n"`])
			]).compiledCode.map(line => line[0])
		).toEqual([`set x 5`, `print "n is 32"`, `set x 5`, `print "n is 53"`, `set x 5`, `print "n is 60"`]);
	});

	it("should unroll nested &for loops", () => {
		let stack:StackElement[] = [
			makeForEl(
				"I", range(1, 3, true), [`loop_$I:`], makeLine("[test]", 1, "unknown")
			),
			makeForEl(
				"J", range(5, 6, true), [`set x 5`, `print "j is $J"`], makeLine("[test]", 1, "unknown")
			)
		];
		const compiledOutput = compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, stack);
		stack = compiledOutput.modifiedStack ?? stack;
		(stack.at(-1) as ForStackElement)?.loopBuffer?.push(...compiledOutput.compiledCode);
		expect(compiledOutput.compiledCode.map(line => line[0]))
			.toEqual([`set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`]);
		expect(compiledOutput.modifiedStack).toEqual([
			makeForEl("I", range(1, 3, true), [`loop_$I:`, `set x 5`, `print "j is 5"`, `set x 5`, `print "j is 6"`], makeLine("[test]", 1, "unknown"))
		]);
		const secondOutput = compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, stack);
		expect(secondOutput.compiledCode.map(line => line[0]))
			.toEqual([
				`loop_1:`, `set x 5`, `print "j is 5"`, `set x 5`,
				`print "j is 6"`, `loop_2:`, `set x 5`, `print "j is 5"`,
				`set x 5`, `print "j is 6"`, `loop_3:`, `set x 5`,
				`print "j is 5"`, `set x 5`, `print "j is 6"`
			]);
		expect(secondOutput.modifiedStack).toEqual([]);

	});

	it("should detect the start of an &if block", () => {
		expect(
			compileLine(makeLine(`&if false {`), new Map(), settingsForFilename("sample.mlogx"), false, []).modifiedStack
		).toEqual([{
			type: "&if",
			commandDefinition: compilerCommands["&if"].overloads[0],
			line: anyLine,
			enabled: false
		}]);
	});

	it("should detect the end of an &if block", () => {
		expect(
			compileLine(makeLine("}"), new Map(), settingsForFilename("sample.mlogx"), false, [makeIfEl(true)]).modifiedStack
		).toEqual([]);
	});

});

describe("compileMlogxToMlog", () => {
	it("should not change any mlog commands", () => {
		for(const line of allMlogCommands){
			expect(
				compileMlogxToMlog([line],
					settingsForFilename("sample1.mlogx"), new Map()
				)
			).toEqual([line]);
		}
	});

	it("should mark all mlogx commands as valid", () => {
		for(const line of allMlogxCommands){
			expect(() =>
				compileMlogxToMlog([line],
					settingsForFilename("sample2.mlogx"), new Map()
				)
			).not.toThrow();
		}
	});

	it("should process all shorthands", () => {
		for(const [input, output] of allShorthandCommands){
			expect(
				compileMlogxToMlog([input],
					settingsForFilename("sample3.mlogx"), new Map()
				)
			).toEqual([output]);
		}
	});
});

describe("addJumpLabels", () => {
	for(const program of Object.values(addLabelsTests)){
		it(program.message, () => {
			expect(
				addJumpLabels(program.source)
			).toEqual(program.expectedOutput);
		});
	}
});

// This is a catch-all to make sure everything works.
describe("compilation", () => {
	for(const [name, program] of Object.entries(testPrograms)){
		it(`should compile ${name} with expected output`, () => {
			expect(
				compileMlogxToMlog(program.program, settingsForFilename("sample3.mlogx"), program.compilerConsts)
			).toEqual(program.expectedOutput);
		});
	}
});
