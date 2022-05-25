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
uflag @flare
radar player distance foreshadow1 1 player


`
.split('\n');
