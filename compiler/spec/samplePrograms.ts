/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 
*/


import { StackElement } from "../types";

export const allMlogCommands:string[] =`\
read result cell1 0
write result cell1 0
draw clear 128 128 128
draw color 128 128 128 255
draw stroke 5
draw line 5 10 55 60
draw rect 5 10 55 60
draw lineRect 5 10 55 60
draw poly 5 10 5 40 180
draw linePoly 5 10 5 40 180
draw triangle 5 10 55 60 5 60
draw image 5 10 @copper 60 180
print "frog"
drawflush display1
printflush message1
getlink result 0
control enabled block1 0
control shoot spectre1 55 55 false
control shootp lancer1 @unit true
radar any enemy ally distance turret1 1 result
radar player attacker flying maxHealth meltdown3 0 output
sensor result block1 @copper
sensor result @unit @copper
set result 0
op add result a b
wait 0.5
lookup item result 0
end
jump -1 notEqual x false
ubind @poly
ucontrol idle
ucontrol stop
ucontrol move 0 0
ucontrol approach 50 50 5
ucontrol boost true
ucontrol pathfind
ucontrol target 50 50 true
ucontrol targetp @unit false
ucontrol itemDrop core 5
ucontrol itemTake core @scrap 9
ucontrol payDrop
ucontrol payTake false
ucontrol payEnter
ucontrol mine 45 45
ucontrol flag 0
ucontrol build 49 49 @inverted-sorter 1 @titanium
ucontrol getBlock @thisx @thisy type building
ucontrol within 51 51 10 isNear
uradar enemy any any distance 0 1 result
ulocate building core true @copper outX outY found building
ulocate building generator false _ outX outY found building
ulocate ore turret true @copper outX outY found building
ulocate damaged repair true @copper outX outY found building
ulocate spawn factory false @copper outX outY found building`
	.split("\n");

export const allMlogxCommands =
`call amogus
return
throw "Error"
uflag @flare`
	.split('\n');

export const allShorthandCommands: [input:string, output:string][] = [
	[`radar enemy distance scatter1 0 unit`, `radar enemy any any distance scatter1 0 unit`],
	[`uradar enemy distance 0 unit`, `uradar enemy any any distance 0 0 unit`],
	[`sensor arc1.shootX`, `sensor arc1.shootX arc1 @shootX`],
	[`sensor unit.x`, `sensor unit.x @unit @x`],
	[`op abs xDiff`, `op abs xDiff xDiff 0`],
	[`op add x 1`, `op add x x 1`],
	[`ulocate ore @copper ore.x ore.y ore.found`, `ulocate ore core _ @copper ore.x ore.y ore.found _`],
	[`ulocate spawn spawn.x spawn.y spawn.found`, `ulocate spawn core _ _ spawn.x spawn.y spawn.found _`],
	[`ulocate damaged damaged.x damaged.y damaged.found damaged`, `ulocate damaged core _ _ damaged.x damaged.y damaged.found damaged`],
	[`ulocate building core true core.x core.y core.exists core`, `ulocate building core true _ core.x core.y core.exists core`]
	
];

export const startNamespace = `namespace testname {`;

export const namespaceTests: [input:string, stack:StackElement[], output:string][] = [
	[`set x 5`, [{type: "namespace", name: "nametest"}], `set _nametest_x 5`],
	[`radar enemy distance scatter1 0 unit`, [{type: "namespace", name: "nametest"}], `radar enemy any any distance scatter1 0 _nametest_unit`],
	[`radar enemy distance scatter1 0 unit`, [{type: "namespace", name: "nametest"}, {type: "namespace", name: "othername"}], `radar enemy any any distance scatter1 0 _nametest_othername_unit`],
];

export const testPrograms: {
	[index: string]: {
		program: string[];
		expectedOutput: string[];
	};
} = {
	emptyProgram: {
		program: [],
		expectedOutput: []
	},
	mostlyEmptyProgram: {
		program: [
			``,
			``,
			` `,
			`\t \t`
		],
		expectedOutput: []
	},
	throughputCounter: {
		program: [
`#Item ThroughputCounter by BalaM314
set stdout message1
set container vault1
sensor container.maxItems container @itemCapacity

no_items:
	print "Item throughput counter"
	print " by [#3141FF]BalaM314[white]\n"
	print "[red]Waiting for items..."
	printflush message1
	sensor container.items container @totalItems
	jump no_items equal container.items 0
start_timer:
	set timer @time
count_items:
	sensor items container @totalItems
	print "[blue]Items received:"
	print items
	printflush stdout
	jump count_items notEqual items container.maxItems
calculate_time:
	op sub timePassed @time timer
	op div timePassed timePassed 1000
	op div fillSpeed container.maxItems timePassed
	print "[green]"
	print fillSpeed
	print " items/second\nWaiting for reset:"
	printflush stdout
wait_for_reset:
	sensor container.items container @totalItems
	jump wait_for_reset notEqual items 0
end`.split("\n")
		],
		expectedOutput: [
`set stdout message1
set container vault1
sensor container.maxItems container @itemCapacity
no_items:
print "Item throughput counter"
print " by [#3141FF]BalaM314[white]\n"
print "[red]Waiting for items..."
printflush message1
sensor container.items container @totalItems
jump no_items equal container.items 0
start_timer:
set timer @time
count_items:
sensor items container @totalItems
print "[blue]Items received:"
print items
printflush stdout
jump count_items notEqual items container.maxItems
calculate_time:
op sub timePassed @time timer
op div timePassed timePassed 1000
op div fillSpeed container.maxItems timePassed
print "[green]"
print fillSpeed
print " items/second\nWaiting for reset:"
printflush stdout
wait_for_reset:
sensor container.items container @totalItems
jump wait_for_reset notEqual items 0
end
end
print "Made with mlogx"
print "github.com/BalaM314/mlogx/"`.split("\n")
		]
	}
};