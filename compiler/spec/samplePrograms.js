import { PortingMode } from "../src/types.js";
import { makeNamespaceEl } from "./test_utils.js";
export const allMlogCommands = `\
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
ucontrol pathfind 20 20
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
ulocate spawn factory false @copper outX outY found building
getblock floor result 10 32
getblock ore result 10 32
getblock block result 10 32
getblock building result 10 32
setblock floor @dark-panel-1 10 32 @derelict 1
setblock ore @plastanium 10 32 @derelict 1
setblock block @foreshadow 10 32 @derelict 1
spawn @dagger 10 10 90 @sharded output
status false tarred unit 10
status true shocked unit 10
spawnwave 10 10 false
setrule waveSpacing 60
setrule unitCap 70
setrule unitBuildSpeed 1.1 @sharded
setrule blockHealth 0.2 @sharded
setrule mapArea 0 10 10 380 380
message announce 3
message notify
message mission
message toast 3
cutscene pan 100 100 0.06
cutscene zoom 100
cutscene stop
explosion @crux 0 0 5 50 true true false
setrate 10
fetch unit result @sharded 0
fetch player result @sharded 0
fetch coreCount result @sharded
fetch buildCount result @sharded 0 @conveyor
getflag result "flag"
setflag "flag" true
setprop @team nucleus1 @sharded
setprop @plastanium @unit 20
effect warn 30 40 0 0 0
effect smokeSquare 30 40 2 %ffaaff 0
effect blockFall 30 40 0 0 @core-nucleus
effect smokeColor 30 40 rotationVar colorVar 0
sync varname`
    .split("\n");
export const allMlogxCommands = `call amogus
return
throw "Error"
uflag @flare`
    .split('\n');
export const allShorthandCommands = [
    [`radar enemy distance scatter1 0 unit`, `radar enemy any any distance scatter1 0 unit`],
    [`uradar enemy distance 0 unit`, `uradar enemy any any distance 0 0 unit`],
    [`sensor arc1.shootX`, `sensor arc1.shootX arc1 @shootX`],
    [`sensor nucleus1[item]`, `sensor nucleus1[item] nucleus1 item`],
    [`sensor unit.x`, `sensor unit.x unit @x`],
    [`sensor @unit.x`, `sensor @unit.x @unit @x`],
    [`sensor @flare.id`, `sensor @flare.id @flare @id`],
    [`op abs xDiff`, `op abs xDiff xDiff 0`],
    [`op add x 1`, `op add x x 1`],
    [`set x 5 + 4`, `op add x 5 4`],
    [`set x 5 % 4`, `op mod x 5 4`],
    [`set x 5 ** 4`, `op pow x 5 4`],
    [`set x 5 \\ 4`, `op idiv x 5 4`],
    [`set x abs 5`, `op abs x 5 0`],
    [`ulocate ore @copper ore.x ore.y ore.found`, `ulocate ore core _ @copper ore.x ore.y ore.found _`],
    [`ulocate spawn spawn.x spawn.y spawn.found`, `ulocate spawn core _ _ spawn.x spawn.y spawn.found _`],
    [`ulocate damaged damaged.x damaged.y damaged.found damaged`, `ulocate damaged core _ _ damaged.x damaged.y damaged.found damaged`],
    [`ulocate building core true core.x core.y core.exists core`, `ulocate building core true _ core.x core.y core.exists core`],
    [`set thing :unit null`, `set thing null`],
    [`status apply tarred unit 10`, `status false tarred unit 10`],
    [`status clear shocked unit`, `status true shocked unit 0`],
    [`setrule unitBuildSpeed @crux 1.1`, `setrule unitBuildSpeed 1.1 @crux`],
    [`setrule mapArea 10 10 380 380`, `setrule mapArea 0 10 10 380 380`],
    [`setprop @unit.x 30`, `setprop @x @unit 30`],
    [`setprop nucleus1[item] 9000`, `setprop item nucleus1 9000`],
    [`effect blockFall 30 40 @core-nucleus`, `effect blockFall 30 40 0 0 @core-nucleus`],
    [`effect placeBlockSpark 30 40 20`, `effect placeBlockSpark 30 40 20 0 0`],
    [`effect vapor 30 40 %aaffaa`, `effect vapor 30 40 0 %aaffaa 0`],
    [`printf "amogus"`, `print "amogus"`],
    [`printf "amogus {x}"`, `print "amogus "\nprint x`],
    [`printf "amogus {x} sus"`, `print "amogus "\nprint x\nprint " sus"`],
    [`printf "amogus {x}{y} sus"`, `print "amogus "\nprint x\nprint y\nprint " sus"`],
    [`println "amogus"`, `print "amogus\\n"`],
];
export const startNamespace = `namespace testname {`;
export const namespaceTests = [
    [`set x 5`, [makeNamespaceEl("nametest")], `set _nametest_x 5`],
    [`print x`, [makeNamespaceEl("nametest")], `print _nametest_x`],
    [`radar enemy distance scatter1 0 unit`, [makeNamespaceEl("nametest")], `radar enemy any any distance scatter1 0 _nametest_unit`],
    [`radar enemy distance scatter1 0 unit`, [makeNamespaceEl("nametest"), makeNamespaceEl("othername")], `radar enemy any any distance scatter1 0 _nametest_othername_unit`],
];
export const testPortPrograms = {
    emptyProgram: {
        program: [],
        expectedOutput: [],
        mode: PortingMode.modernSyntax,
    },
    mostlyEmptyProgram: {
        program: [
            ``,
            ``,
            ` `,
            `\t \t`
        ],
        expectedOutput: [],
        mode: PortingMode.modernSyntax,
    },
    verySimpleNoChanges: {
        program: [
            `print "amogus"`,
        ],
        expectedOutput: [
            `print "amogus"`,
        ],
        mode: PortingMode.modernSyntax,
    },
    simpleNoChanges: {
        program: [
            `print "amogus"`,
            `printflush message1`,
            `set x false`,
            `read value cell1 7`,
        ],
        expectedOutput: [
            `print "amogus"`,
            `printflush message1`,
            `set x false`,
            `read value cell1 7`,
        ],
        mode: PortingMode.modernSyntax,
    },
    removeZeroes: {
        program: [
            `draw clear 0 0 0`,
            `draw clear 0 0 0 0`,
            `draw clear 0 0 0 0 0 0`,
            `draw linePoly 50 50 6 30 10`,
            `jump label always x false`,
            `op add x 2 2`,
            `op mul x x 2`
        ],
        expectedOutput: [
            `draw clear 0 0 0`,
            `draw clear 0 0 0`,
            `draw clear 0 0 0`,
            `draw linePoly 50 50 6 30 10`,
            `jump label always`,
            `op add x 2 2`,
            `op mul x x 2`
        ],
        mode: PortingMode.removeZeroes,
    },
    shortenSyntax: {
        program: [
            `print "amogus"`,
            `jump label always`,
            `op abs x x`,
            `ubind @poly`,
            `sensor h @unit @health`,
            `sensor @unit.health @unit @health`,
            `broken:`,
            `radar enemy any any maxHealth @this 0 enemy`,
            `radar enemy enemy enemy maxHealth @this 1 enemy2`,
            `uradar enemy enemy enemy distance 0 1 enemy3`,
            `uradar enemy ground any distance 0 1 enemy4`,
            `jump broken notEqual enemy enemy2`,
            `ulocate building core true outX outY found core`,
            `ulocate building core true @copper outX outY found core2`,
            `ulocate building generator false @lead gen.x gen.y _ gen`,
            `ulocate building generator shouldEnemy @lead gen.x gen.y _ gen`,
            `ulocate building generator true @lead egen.x egen.Y _ egen`,
            `ulocate building core false @lead core.x core.y _ core`,
            `ulocate building core true @lead core.x core.y _ core`,
        ],
        expectedOutput: [
            `print "amogus"`,
            `jump label`,
            `op abs x`,
            `ubind @poly`,
            `sensor h @unit @health`,
            `sensor @unit.health`,
            `broken:`,
            `radar enemy maxHealth @this 0 enemy`,
            `radar enemy maxHealth @this 1 enemy2`,
            `uradar enemy distance 1 enemy3`,
            `uradar enemy ground any distance 1 enemy4`,
            `jump broken notEqual enemy enemy2`,
            `ulocate building core true outX outY found core`,
            `ulocate building core true outX outY found core2`,
            `ulocate building generator gen`,
            `ulocate building generator gen shouldEnemy`,
            `ulocate building generator true egen.x egen.Y _ egen`,
            `ulocate core`,
            `ulocate core true`,
        ],
        mode: PortingMode.shortenSyntax,
    },
    modernSyntax: {
        program: [
            `print "oo fancy"`,
            `set x false`,
            `jump label always x false`,
            `jump label greaterThanEq x 2`,
            `op add y 2 2`,
            `op abs y y 0`,
            `op idiv z y 30`,
            `setrule unitBuildSpeed 1.2 @sharded 0 0 0`
        ],
        expectedOutput: [
            `print "oo fancy"`,
            `set x false`,
            `jump label`,
            `jump label x >= 2`,
            `set y 2 + 2`,
            `op abs y`,
            `set z y \\ 30`,
            `setrule unitBuildSpeed @sharded 1.2`
        ],
        mode: PortingMode.modernSyntax,
    },
};
export const testPrograms = {
    emptyProgram: {
        program: [],
        expectedOutput: [],
        compilerConsts: {}
    },
    mostlyEmptyProgram: {
        program: [
            ``,
            ``,
            ` `,
            `\t \t`
        ],
        expectedOutput: [],
        compilerConsts: {}
    },
    compilerConstsTest: {
        program: `#compiler consts test
print "number $x"
print "string $e"
print "boolean $y"
print "array $array $array[1] $array.length"
print "number $foo.bar.baz"`.split("\n"),
        expectedOutput: `print "number 2"
print "string STR"
print "boolean false"
print "array 56 vvv true 56 3"
print "number 420"`.split("\n"),
        compilerConsts: {
            x: 2,
            e: "STR",
            y: false,
            array: [56, "vvv", true],
            foo: {
                bar: {
                    baz: 420
                }
            }
        }
    },
    splitStatementsTest: {
        program: `#split test
print "amogus"
draw clear 0 0 0
set x 5;set x 6`.split("\n"),
        expectedOutput: `print "amogus"
draw clear 0 0 0
set x 5
set x 6`.split("\n"),
        compilerConsts: {}
    },
    "&if test": {
        program: `#&if test
print "amogus"
&if true {
	print "true"
}
&if false {
	print "false"
}
&if true {
	print "true!"
	&if false {
		print "false!"
	}
}`.split("\n"),
        expectedOutput: `print "amogus"
print "true"
print "true!"`.split("\n"),
        compilerConsts: {}
    },
    "&for test": {
        program: `#&for test
print "amogus"
&for x in 1 3 {
	print "sus $(x)"
}`.split("\n"),
        expectedOutput: `print "amogus"
print "sus 1"
print "sus 2"
print "sus 3"`.split("\n"),
        compilerConsts: {}
    },
    "nested &for test": {
        program: `
&for x of a B {
	print "sus $(x)"
	&for Y in 5 6 {
		print "amogus $(x) $Y"
	}
}
`.split("\n"),
        expectedOutput: `print "sus a"
print "amogus a 5"
print "amogus a 6"
print "sus B"
print "amogus B 5"
print "amogus B 6"`.split("\n"),
        compilerConsts: {}
    },
    "complicated &for test": {
        program: `#&for test
print "amogus"
&for z in 1 3 {
	set thing_$z :number null
}
set a thing_2 + 0
&for x of a d E {
	print "sus $(x)"
	&for Y in 5 6 {
		print "amogus $(x) $Y"
	}
}
`.split("\n"),
        expectedOutput: `print "amogus"
set thing_1 null
set thing_2 null
set thing_3 null
op add a thing_2 0
print "sus a"
print "amogus a 5"
print "amogus a 6"
print "sus d"
print "amogus d 5"
print "amogus d 6"
print "sus E"
print "amogus E 5"
print "amogus E 6"`.split("\n"),
        compilerConsts: {}
    },
    sensorshorthand: {
        program: `set core nucleus1
sensor core[item]
set x core[item] + 5`.split("\n"),
        expectedOutput: `set core nucleus1
sensor core[item] core item
op add x core[item] 5`.split("\n"),
        compilerConsts: {}
    },
    throughputCounter: {
        program: `#Item ThroughputCounter by BalaM314
set stdout message1
set container vault1
sensor container.maxItems container @itemCapacity

no_items:
	print "Item throughput counter"
	print " by [#3141FF]BalaM314[white]\\n"
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
	print " items/second\\nWaiting for reset:"
	printflush stdout
wait_for_reset:
	sensor container.items container @totalItems
	jump wait_for_reset notEqual items 0
end`.split("\n"),
        expectedOutput: `set stdout message1
set container vault1
sensor container.maxItems container @itemCapacity
no_items:
print "Item throughput counter"
print " by [#3141FF]BalaM314[white]\\n"
print "[red]Waiting for items..."
printflush message1
sensor container.items container @totalItems
jump no_items equal container.items 0
set timer @time
count_items:
sensor items container @totalItems
print "[blue]Items received:"
print items
printflush stdout
jump count_items notEqual items container.maxItems
op sub timePassed @time timer
op div timePassed timePassed 1000
op div fillSpeed container.maxItems timePassed
print "[green]"
print fillSpeed
print " items/second\\nWaiting for reset:"
printflush stdout
wait_for_reset:
sensor container.items container @totalItems
jump wait_for_reset notEqual items 0
end`.split("\n"),
        compilerConsts: {}
    },
    multiPayenter: {
        program: `#For when one reconstructor isn't enough.
#Multi Payenter by BalaM314
#require cookie

print "$numReconstructorsx Payenter by BalaM314"
print "Source code available at $githubUrl"
#Config
set unitType @horizon
set offSwitch switch1
print "Config options above"
#Runtime variables
restart:
	&for n in 1 $numReconstructors {
		jump restart equal reconstructor$n null
		sensor reconstructor$n.x
		sensor reconstructor$n.y
	}

&for n in 1 $numReconstructors {
	set unit$n :unit null
}

main_loop:
	jump not_switched_off equal offSwitch null
	sensor offSwitch.enabled
	jump main_loop equal offSwitch.enabled false
	not_switched_off:

	check_units:
		&for n in 1 $numReconstructors {
			check_unit$n_ok:
			sensor unit$n.dead
			sensor unit$n.controlled
			jump bind_unit$n equal unit$n.dead true
			jump bind_unit$n greaterThan unit$n.controlled 1
			unit$n_ok:
		}

	move_units:
		&for n in 1 $numReconstructors {
			move_unit$n:
			ubind unit$n
			ucontrol move reconstructor$n.x reconstructor$n.y
			ucontrol within reconstructor$n.x reconstructor$n.y 3 unit$n.reached
			jump unit$n_moved equal unit$n.reached false
			#unit reached destination, payenter
			ucontrol payEnter
			unit$n_moved:
		}
		
		jump main_loop

		
	&for n in 1 $numReconstructors {
		bind_unit$n:
		#Bind a unit, but check if it's alive and unflagged.
		ubind unitType
		sensor @unit.flag
		sensor @unit.controlled
		jump bind_unit$n notEqual @unit.flag 0
		jump bind_unit$n greaterThan @unit.controlled 1
		ucontrol flag cookie
		set unit$n @unit
		jump unit$n_ok
	}`.split("\n"),
        expectedOutput: `op mul cookie @thisx @maph
op add cookie @thisy cookie
print "6x Payenter by BalaM314"
print "Source code available at https://github.com/BalaM314/mlog/tree/main/single_files/payEnter/"
set unitType @horizon
set offSwitch switch1
print "Config options above"
restart:
jump restart equal reconstructor1 null
sensor reconstructor1.x reconstructor1 @x
sensor reconstructor1.y reconstructor1 @y
jump restart equal reconstructor2 null
sensor reconstructor2.x reconstructor2 @x
sensor reconstructor2.y reconstructor2 @y
jump restart equal reconstructor3 null
sensor reconstructor3.x reconstructor3 @x
sensor reconstructor3.y reconstructor3 @y
jump restart equal reconstructor4 null
sensor reconstructor4.x reconstructor4 @x
sensor reconstructor4.y reconstructor4 @y
jump restart equal reconstructor5 null
sensor reconstructor5.x reconstructor5 @x
sensor reconstructor5.y reconstructor5 @y
jump restart equal reconstructor6 null
sensor reconstructor6.x reconstructor6 @x
sensor reconstructor6.y reconstructor6 @y
set unit1 null
set unit2 null
set unit3 null
set unit4 null
set unit5 null
set unit6 null
main_loop:
jump not_switched_off equal offSwitch null
sensor offSwitch.enabled offSwitch @enabled
jump main_loop equal offSwitch.enabled false
not_switched_off:
sensor unit1.dead unit1 @dead
sensor unit1.controlled unit1 @controlled
jump bind_unit1 equal unit1.dead true
jump bind_unit1 greaterThan unit1.controlled 1
unit1_ok:
sensor unit2.dead unit2 @dead
sensor unit2.controlled unit2 @controlled
jump bind_unit2 equal unit2.dead true
jump bind_unit2 greaterThan unit2.controlled 1
unit2_ok:
sensor unit3.dead unit3 @dead
sensor unit3.controlled unit3 @controlled
jump bind_unit3 equal unit3.dead true
jump bind_unit3 greaterThan unit3.controlled 1
unit3_ok:
sensor unit4.dead unit4 @dead
sensor unit4.controlled unit4 @controlled
jump bind_unit4 equal unit4.dead true
jump bind_unit4 greaterThan unit4.controlled 1
unit4_ok:
sensor unit5.dead unit5 @dead
sensor unit5.controlled unit5 @controlled
jump bind_unit5 equal unit5.dead true
jump bind_unit5 greaterThan unit5.controlled 1
unit5_ok:
sensor unit6.dead unit6 @dead
sensor unit6.controlled unit6 @controlled
jump bind_unit6 equal unit6.dead true
jump bind_unit6 greaterThan unit6.controlled 1
unit6_ok:
ubind unit1
ucontrol move reconstructor1.x reconstructor1.y
ucontrol within reconstructor1.x reconstructor1.y 3 unit1.reached
jump unit1_moved equal unit1.reached false
ucontrol payEnter
unit1_moved:
ubind unit2
ucontrol move reconstructor2.x reconstructor2.y
ucontrol within reconstructor2.x reconstructor2.y 3 unit2.reached
jump unit2_moved equal unit2.reached false
ucontrol payEnter
unit2_moved:
ubind unit3
ucontrol move reconstructor3.x reconstructor3.y
ucontrol within reconstructor3.x reconstructor3.y 3 unit3.reached
jump unit3_moved equal unit3.reached false
ucontrol payEnter
unit3_moved:
ubind unit4
ucontrol move reconstructor4.x reconstructor4.y
ucontrol within reconstructor4.x reconstructor4.y 3 unit4.reached
jump unit4_moved equal unit4.reached false
ucontrol payEnter
unit4_moved:
ubind unit5
ucontrol move reconstructor5.x reconstructor5.y
ucontrol within reconstructor5.x reconstructor5.y 3 unit5.reached
jump unit5_moved equal unit5.reached false
ucontrol payEnter
unit5_moved:
ubind unit6
ucontrol move reconstructor6.x reconstructor6.y
ucontrol within reconstructor6.x reconstructor6.y 3 unit6.reached
jump unit6_moved equal unit6.reached false
ucontrol payEnter
unit6_moved:
jump main_loop always 0 0
bind_unit1:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit1 notEqual @unit.flag 0
jump bind_unit1 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit1 @unit
jump unit1_ok always 0 0
bind_unit2:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit2 notEqual @unit.flag 0
jump bind_unit2 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit2 @unit
jump unit2_ok always 0 0
bind_unit3:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit3 notEqual @unit.flag 0
jump bind_unit3 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit3 @unit
jump unit3_ok always 0 0
bind_unit4:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit4 notEqual @unit.flag 0
jump bind_unit4 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit4 @unit
jump unit4_ok always 0 0
bind_unit5:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit5 notEqual @unit.flag 0
jump bind_unit5 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit5 @unit
jump unit5_ok always 0 0
bind_unit6:
ubind unitType
sensor @unit.flag @unit @flag
sensor @unit.controlled @unit @controlled
jump bind_unit6 notEqual @unit.flag 0
jump bind_unit6 greaterThan @unit.controlled 1
ucontrol flag cookie
set unit6 @unit
jump unit6_ok always 0 0`.split("\n"),
        compilerConsts: {
            message: "[orange]Core T4 Payenter[] by [#3141FF]BalaM314[]",
            numReconstructors: "6",
            githubUrl: "https://github.com/BalaM314/mlog/tree/main/single_files/payEnter/",
        }
    },
    thing: {
        program: `print "e"`.split("\n"),
        expectedOutput: `print "e"`.split("\n"),
        compilerConsts: {}
    },
};
export const addLabelsTests = {
    no_hardcoded_labels: {
        source: `set doIKnowWhatToPutHere false
print "more code"
print "very useful code"
ulocate building core true outX outY found building`.split("\n"),
        expectedOutput: `set doIKnowWhatToPutHere false
print "more code"
print "very useful code"
ulocate building core true outX outY found building`.split("\n"),
        message: "should not modify code without numeric jump labels"
    },
    oneline: {
        source: `set doIKnowWhatToPutHere false
jump 1 always`.split("\n"),
        expectedOutput: `set doIKnowWhatToPutHere false
jump_0_: #AUTOGENERATED
jump jump_0_ always`.split("\n"),
        message: "should replace numeric jump labels in 2 line programs"
    },
    simple: {
        source: `set doIKnowWhatToPutHere false
jump 2 notEqual this.bored false
print "more code"
print "very useful code"
ulocate building core true outX outY found building
jump 4 always 0
jump 4 always`.split("\n"),
        expectedOutput: `set doIKnowWhatToPutHere false
jump jump_0_ notEqual this.bored false
jump_0_: #AUTOGENERATED
print "more code"
print "very useful code"
jump_1_: #AUTOGENERATED
ulocate building core true outX outY found building
jump jump_1_ always 0
jump jump_1_ always`.split("\n"),
        message: "should replace numeric jump labels in programs with a bit more code"
    },
};
