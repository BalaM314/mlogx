import { GenericArgs, typeofArg } from "../args.js";
import { CompilerError, Statement } from "../classes.js";
import { maxLoops, MindustryContent, shortOperandMappings } from "../consts.js";
import { Log } from "../Log.js";
import { addNamespacesToLine, getCommandDefinition, impossible, interpolateString, isKey, range, replaceCompilerConstants, splitLineIntoArguments } from "../funcs.js";
import { hasDisabledIf, hasElement, topForLoop } from "../stack_elements.js";
import { PortingMode } from "../types.js";
import { processCommands, processCompilerCommands } from "./funcs.js";
export const commands = processCommands({
    call: [{
            args: "function:variable",
            replace: [
                "op add @counter _stack1 1",
                "jump %1 always"
            ],
            description: "Calls (function)."
        }],
    increment: [{
            args: "variable:variable amount:number",
            replace: ["op add %1 %1 %2"],
            description: "Adds (amount) to (variable)."
        }],
    return: [{
            args: "",
            replace: ["set @counter _stack1"],
            description: "Returns to the main program from a function."
        }],
    throw: [{
            args: "error:string",
            replace: [
                "set err %1",
                "jump err always"
            ],
            description: "Throws (error). Requires you to include \"err\"."
        }],
    uflag: [{
            args: "type:unitType",
            replace: [
                "set unit_type %1",
                "op add @counter _stack1 1",
                "jump flag_unit always",
            ],
            description: "Binds and flags a unit of type (type). Requires you to include \"flag_unit\"."
        }],
    printf: [{
            args: "message:string",
            replace(args) {
                return interpolateString(args[1].slice(1, -1)).map(chunk => chunk.type == "string" ? `print "${chunk.content}"` : `print ${chunk.content}`);
            },
            description: "Print statement with string interpolation."
        }],
    println: [{
            args: "message:string",
            replace(args) {
                return [`print ${args[1].replace(/"$/, `\\n"`)}`];
            },
            description: "Print statement with newline appended."
        }],
    read: [{
            args: "output:*number cell:building index:number",
            description: "Reads a value at index (index) from memory cell (cell) and stores it in (output)."
        }],
    write: [{
            args: "value:number cell:building index:number",
            description: "Writes (value) at index (index) to memory cell (cell)."
        }],
    draw: [
        {
            args: "clear r:number g:number b:number",
            description: "Clears the display, replacing it with color (r,g,b)."
        }, {
            args: "color r:number g:number b:number a:number",
            description: "Sets the draw color to (r,g,b)."
        }, {
            args: "col packedColor:number",
            description: "Sets the draw color to (packedColor)."
        }, {
            args: "stroke width:number",
            description: "Sets the stroke width to (width)."
        }, {
            args: "line x1:number y1:number x2:number y2:number",
            description: "Draws a line between (x1, y1) and (x2, y2)."
        }, {
            args: "rect x:number y:number width:number height:number",
            description: "Draws a rectangle with lower right corner at (x,y) with width (width) and height (height)."
        }, {
            args: "lineRect x:number y:number width:number height:number",
            description: "Draws the outline of a rectangle with lower right corner at (x,y) with width (width) and height (height)."
        }, {
            args: "poly x:number y:number sides:number radius:number rotation:number",
            description: "Draws a (regular) polygon centered at (x,y) with (sides) sides and a radius of (radius)."
        }, {
            args: "linePoly x:number y:number sides:number radius:number rotation:number",
            description: "Draws the outline of a polygon centered at (x,y) with (sides) sides and a radius of (radius)."
        }, {
            args: "triangle x1:number y1:number x2:number y2:number x3:number y3:number",
            description: "Draws a triangle between the points (x1, y1), (x2, y2), and (x3, y3)."
        }, {
            args: "image x:number y:number image:imageType size:number rotation:number",
            description: "Displays an image of (image) centered at (x,y) with size (size) and rotated (rotation) degrees."
        },
    ],
    drawflush: [{
            args: "display:building",
            description: "Flushes queued draw instructions to (display)."
        }],
    print: [{
            args: "message:any",
            description: "Prints (message) to the message buffer."
        }],
    printflush: [
        {
            args: "messageblock:building",
            description: "Flushes queued print instructions to (messageblock)."
        }, {
            args: "null",
            description: "Clears queued print instructions."
        }
    ],
    getlink: [{
            args: "output:*building n:number",
            description: "Gets the (n)th linked building and stores it in (building). Useful when looping over all buildings."
        }],
    control: [
        {
            args: "enabled building:building enabled:boolean",
            description: "Sets whether (building) is enabled."
        }, {
            args: "shoot turret:building x:number y:number shoot:boolean",
            description: "Sets the shoot position of (turret) to (x,y) and shoots if (shoot)."
        }, {
            args: "shootp turret:building unit:unit shoot:boolean",
            description: "Sets the shoot position of (turret) to (unit) with velocity prediction and shoots if (shoot)."
        }, {
            args: "config building:building config:any",
            description: "Sets the config of (building) to (config)."
        }, {
            args: "color illuminator:building r:number g:number b:number",
            description: "Sets the color of (illuminator) to (r,g,b)."
        },
    ],
    radar: [
        {
            args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
            description: "Finds a unit of specified type within the range of (turret) and stores it in (output).",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax && ((args[1] == args[2] && args[2] == args[3]) || (args[2] == "any" && args[3] == "any")))
                    return `${args[0]} ${args[1]} ${args[4]} ${args[5]} ${args[6]} ${args[7]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "targetClass:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
            description: "Finds a unit of specified type within the range of (turret) and stores it in (output). Shortened form of the regular radar instruction.",
            replace: [
                "radar %1 any any %2 %3 %4 %5"
            ]
        }, {
            args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
            description: "Finds a unit of specified type within the range of (turret) and stores it in (output). Shortened form of the regular radar instruction with sortOrder and turret swapped.",
            replace: [
                "radar %1 any any %2 %4 %3 %5"
            ]
        }, {
            args: "targetClass:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
            description: "Finds a unit of specified type within the range of (turret) and stores it in (output). sortOrder and turret are swapped.",
            replace: [
                "radar %1 %2 %3 %4 %6 %5 %7"
            ]
        },
    ],
    sensor: [
        {
            args: "output:*any building:building value:senseable",
            description: "Gets information about (building) and stores it in (output), does not need to be linked or on the same team.",
            port(args, mode) {
                if (args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
                    return `sensor ${args[1]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "output:*any unit:unit value:senseable",
            description: "Gets information about (unit) and stores it in (output), does not need to be on the same team.",
            port(args, mode) {
                if (args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
                    return `sensor ${args[1]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "thing.property:*any",
            replace(args) {
                if (args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i)) {
                    const [, target, property] = args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i);
                    if (target == null || property == null)
                        impossible();
                    if (!MindustryContent.senseables.includes(property))
                        CompilerError.throw("property not senseable", { property });
                    return [`sensor ${args[1]} ${target == "unit" ? "@unit" : target} @${property}`];
                }
                else if (args[1].match(/^([\w@_$-()]+?)\[([\w@_$()-]+?)]\$/i)) {
                    const [, target, property] = args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i);
                    if (target == null || property == null)
                        impossible();
                    return [`sensor ${args[1]} ${target == "unit" ? "@unit" : target} ${property}`];
                }
                else {
                    CompilerError.throw("invalid sensor shorthand", { arg: args[1] });
                }
            },
            description: "Gets information about a unit or building and stores it in (thing.property), does not need to be linked or on the same team. Example usage: sensor player.shootX will read the player's shootX into the variable player.shootX",
            getVariablesUsed(args) {
                let target, property;
                if (args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i)) {
                    [, target, property] = args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i);
                    if (target == null || property == null)
                        impossible();
                }
                else if (args[1].match(/^([\w@_$-()]+?)\[([\w@_$()-]+?)]\$/i)) {
                    [, target, property] = args[1].match(/^([\w@_$-()]+?)\.([\w@_$()-]+?)$/i);
                    if (target == null || property == null)
                        impossible();
                }
                return [[target, ["building", "unit"]]];
            }
        }
    ],
    set: [
        {
            args: "variable:*any value:any",
            description: "Sets the value of (variable) to (value).",
            getVariablesDefined: (args) => [[args[1], typeofArg(args[2]) == "variable" ? "any" : typeofArg(args[2])]]
        }, {
            args: "variable:*any type:ctype value:any",
            description: "Sets the value of (variable) to (value), and the type of (variable) to (type).",
            replace: (args) => {
                const type = args[2].slice(1);
                if (isKey(GenericArgs, type)) {
                    return [`set ${args[1]} ${args[3]}`];
                }
                else {
                    CompilerError.throw("invalid type", { type });
                }
            },
            getVariablesDefined: (args) => {
                const type = args[2].slice(1);
                if (isKey(GenericArgs, type)) {
                    return [[args[1], args[2].slice(1)]];
                }
                else {
                    CompilerError.throw("invalid type", { type });
                }
            }
        }, {
            args: "variable:*number arg1:number operand:sOperandDouble arg2:number",
            description: "Alternative syntax for the op statement: sets (variable) to (arg1) (operand) (arg2). Example: set reactor.tooHot reactor.heat => 0.1 will compile to op greaterThanEq reactor.tooHot reactor.heat 0.1",
            replace: (args) => [`op ${shortOperandMappings.double[args[3]]} ${args[1]} ${args[2]} ${args[4]}`]
        }
    ],
    op: [
        {
            args: "operand:operandSingle output:*number arg1:number zero:0?",
            description: "Sets (output) to (operand) (arg1).",
            replace: ["op %1 %2 %3 0"],
            port(args, mode) {
                if (mode >= PortingMode.removeZeroes) {
                    if (args[4] == "0")
                        args.splice(4, 1);
                }
                if (mode >= PortingMode.shortenSyntax) {
                    if (args[2] == args[3])
                        return `op ${args[1]} ${args[2]}`;
                }
                return args.join(" ");
            },
        }, {
            args: "operand:operandDouble output:*number arg1:number arg2:number",
            description: "Sets (output) to (arg1) (operand) (arg2).",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax) {
                    if (args[2] == args[3])
                        return `op ${args[1]} ${args[2]} ${args[4]}`;
                }
                return args.join(" ");
            },
        }, {
            args: "operand:operandDouble output:*number arg1:number",
            description: "Sets (output) to (output) (operand) (arg1). Useful for doubling a number, or adding 1 to it.",
            replace: ["op %1 %2 %2 %3"]
        }, {
            args: "operand:operandSingle arg1:*number",
            description: "Sets (arg1) to (operand) (arg1). Example: `op abs xDiff`",
            replace: ["op %1 %2 %2 0"]
        }
    ],
    wait: [{
            args: "seconds:number",
            description: "Waits for (seconds) seconds."
        }],
    lookup: [
        {
            args: "item output:*itemType n:number",
            description: "Looks up the (n)th item and stores it in (output)."
        }, {
            args: "block output:*buildingType n:number",
            description: "Looks up the (n)th building and stores it in (output)."
        }, {
            args: "liquid output:*liquidType n:number",
            description: "Looks up the (n)th fluid and stores it in (output)."
        }, {
            args: "unit output:*unitType n:number",
            description: "Looks up the (n)th unit and stores it in (output)."
        },
    ],
    packcolor: [{
            args: "output:*number r:number g:number b:number a:number",
            description: "Packs (r,g,b,a) into a single number."
        }],
    end: [{
            args: "",
            description: "Goes back to the start."
        }],
    stop: [{
            args: "",
            description: "Stops execution."
        }],
    jump: [
        {
            args: "jumpAddress:jumpAddress always var1:any? var2:any?",
            description: "Jumps to (jumpAddress).",
            replace: ["jump %1 always 0 0"],
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax) {
                    return `jump ${args[1]}`;
                }
                else if (mode >= PortingMode.removeZeroes) {
                    return `jump ${args[1]} always`;
                }
                return args.join(" ");
            }
        }, {
            args: "jumpAddress:jumpAddress operand:operandTest var1:any var2:any",
            description: "Jumps to (jumpAddress) if (var1) (operand) (var2).",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax) {
                    if (args[2] == "always")
                        return `jump ${args[1]}`;
                }
                else if (mode >= PortingMode.removeZeroes) {
                    if (args[2] == "always")
                        return `jump ${args[1]} always`;
                }
                return args.join(" ");
            },
        }, {
            args: "jumpAddress:jumpAddress",
            description: "Jumps to (jumpAddress).",
            replace: ["jump %1 always 0 0"]
        }, {
            args: "jumpAddress:jumpAddress var1:any operand:sOperandTest var2:any",
            description: "Alternative jump syntax: Jumps to (jumpAddress) if (var1) (operand) (var2). Uses short operands like <= instead of lessThanEq.",
            replace: (args) => [`jump ${args[1]} ${shortOperandMappings.test[args[3]]} ${args[2]} ${args[4]}`]
        },
    ],
    ubind: [
        {
            args: "unitType:unitType",
            description: "Binds a unit of (unitType). May return dead units if no live ones exist."
        }, {
            args: "null:null",
            description: "Unbinds the current unit."
        }, {
            args: "unit:unit",
            description: "Binds a specific unit."
        },
    ],
    ucontrol: [
        {
            args: "idle",
            description: "Tells the bound unit to stop moving, but continue other actions."
        }, {
            args: "stop",
            description: "Tells the bound unit to stop all actions."
        }, {
            args: "move x:number y:number",
            description: "Tells the bound unit to move to (x,y). Does not wait for the unit to reach."
        }, {
            args: "approach x:number y:number radius:number",
            description: "Tells the bound unit to approach (x,y) but stay (radius) away. Does not wait for the unit to reach."
        }, {
            args: "boost enable:boolean",
            description: "Tells the bound unit to boost or not boost."
        }, {
            args: "pathfind",
            description: "Tells the bound unit to follow its normal AI."
        }, {
            args: "target x:number y:number shoot:boolean",
            description: "Tells the bound unit to target/shoot (x,y).\nWill not shoot if the position is outside the unit's range."
        }, {
            args: "targetp unit:unit shoot:boolean",
            description: "Tells the bound unit to target/shoot a unit.\nWill not shoot if the position is outside the unit's range."
        }, {
            args: "itemDrop building:building amount:number",
            description: "Tells the bound unit to drop at most (amount) items to (building)."
        }, {
            args: "itemTake building:building item:itemType amount:number",
            description: "Tells the bound unit to take at most (amount) of (item) from (building)."
        }, {
            args: "payDrop",
            description: "Tells the bound unit to drop its payload."
        }, {
            args: "payTake takeUnits:boolean",
            description: "Tells the bound unit to pick up a payload and whether or not to grab units."
        }, {
            args: "payEnter",
            description: "Tells the bound unit to enter a building(usually a reconstructor)."
        }, {
            args: "mine x:number y:number",
            description: "Tells the unit to mine at (x,y)."
        }, {
            args: "flag flag:number",
            description: "Sets the flag of the bound unit."
        }, {
            args: "build x:number y:number buildingType:buildingType rotation:number config:any",
            description: "Tells the unit to build (block) with (rotation) and (config) at (x,y)."
        }, {
            args: "getBlock x:number y:number buildingType:*buildingType building:*building",
            description: "Gets the building type and building at (x,y) and outputs to (buildingType) and (building). Required if you want to get the building object for a building on another team."
        }, {
            args: "within x:number y:number radius:number output:*boolean",
            description: "Checks if the unit is within (radius) tiles of (x,y) and outputs to (output)."
        },
    ],
    uradar: [
        {
            args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*unit",
            description: "Finds a unit of specified type within the range of the bound unit and stores it in (output).",
            replace: [
                "uradar %1 %2 %3 %4 0 %5 %6"
            ]
        }, {
            args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sillyness:0 sortOrder:number output:*unit",
            description: "Today I learned that the default signature of uradar has a random 0 that doesn't mean anything.",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax && ((args[1] == args[2] && args[2] == args[3]) || (args[2] == "any" && args[3] == "any")))
                    return `${args[0]} ${args[1]} ${args[4]} ${args[6]} ${args[7]}`;
                else if (mode >= PortingMode.removeZeroes)
                    return `${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} ${args[6]} ${args[7]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*unit",
            description: "Finds a unit of specified type within the range of the bound unit and stores it in (output). Sorter version of the regular uradar instruction.",
            replace: [
                "uradar %1 any any %2 0 %3 %4"
            ]
        },
    ],
    ulocate: [
        {
            args: "ore ore:itemType outX:*number outY:*number found:*boolean",
            description: "Finds an (ore) ore near the bound unit and stores its position in (outX, outY).",
            replace: ["ulocate ore core _ %2 %3 %4 %5 _"]
        }, {
            args: "spawn outX:*number outY:*number found:*boolean",
            description: "Finds an enemy spawnpoint near the bound unit and stores its position in (outX, outY).",
            replace: ["ulocate spawn core _ _ %2 %3 %4 _"]
        }, {
            args: "damaged outX:*number outY:*number found:*boolean building:*building",
            description: "Finds a damaged building near the bound unit and stores its position in (outX, outY).",
            replace: ["ulocate damaged core _ _ %2 %3 %4 %5"]
        }, {
            args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
            description: "Finds a building of specified group near the bound unit, storing its position in (outX, outY) and the building in (building) if it is on the same team.",
            replace: ["ulocate building %2 %3 _ %4 %5 %6 %7"]
        }, {
            args: "locateable:locateable buildingGroup:buildingGroup enemy:boolean ore:itemType outX:*number outY:*number found:*boolean building:*building",
            description: "The wack default ulocate signature, included for compatibility.",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax) {
                    switch (args[1]) {
                        case "ore":
                            return `ulocate ore ${args[4]} ${args[5]} ${args[6]} ${args[7]}`;
                        case "spawn":
                            return `ulocate spawn ${args[5]} ${args[6]} ${args[7]}`;
                        case "damaged":
                            return `ulocate damaged ${args[5]} ${args[6]} ${args[7]} ${args[8]}`;
                        case "building":
                            return `ulocate building ${args[2]} ${args[3]} ${args[5]} ${args[6]} ${args[7]} ${args[8]}`;
                        default:
                            Log.printMessage("statement port failed", {
                                name: args[0], statement: args.join(" ")
                            });
                    }
                }
                return args.join(" ");
            },
        }, {
            args: "building buildingGroup:buildingGroup buildingName:*building enemy:boolean?",
            description: "Finds a building of specified group near the bound unit, storing its position in (buildingName.x, buildingName.y) and the building in (building) if it is on the same team.",
            replace: (args) => [`ulocate building ${args[2]} ${args[4] ?? "false"} _ ${args[3]}.x ${args[3]}.y ${args[3]}.found ${args[3]}`]
        }, {
            args: "core enemy:boolean?",
            description: "Finds the core.",
            replace: (args) => [`ulocate building core ${args[2] ?? "false"} _ core.x core.y core.found core`]
        },
    ],
    getblock: [
        {
            args: "floor output:*any x:number y:number",
            description: "outputs the floor type at coordinates (x,y)",
            isWorldProc: true
        }, {
            args: "ore output:*item x:number y:number",
            description: "outputs the ore type at coordinates (x,y)",
            isWorldProc: true
        }, {
            args: "block output:*buildingType x:number y:number",
            description: "outputs the building type at coordinates (x,y)",
            isWorldProc: true
        }, {
            args: "building output:building x:number y:number",
            description: "outputs the building at coordinates (x,y)",
            isWorldProc: true
        }
    ],
    setblock: [
        {
            args: "floor floorType:any x:number y:number",
            description: "sets the floor type at coordinates (x,y)",
            replace: ["setblock %1 %2 %3 %4 0 0"],
            isWorldProc: true
        }, {
            args: "ore oreType:item x:number y:number",
            description: "sets the ore type at coordinates (x,y)",
            replace: ["setblock %1 %2 %3 %4 0 0"],
            isWorldProc: true
        }, {
            args: "block buildingType:buildingType x:number y:number team:team rotation:number",
            description: "sets the block at coordinates (x,y) with a team and a counter clockwise rotation starting at the right [0 - 3]",
            replace: ["setblock %1 %2 %3 %4 0 0"],
            isWorldProc: true
        }, {
            args: "floorOrOreOrBlock:any type:any x:number y:number team:team? rotation:number?",
            description: "Default setblock signature, with meaningless team and rotation arguments. Included for compatibility.",
            isWorldProc: true
        }
    ],
    spawn: [{
            args: "type:unitType x:number y:number rotation:number team:team output:*unit",
            description: "Spawns a (type) unit at (x,y) with rotation (rotation) and team (team), storing it in (output).",
            isWorldProc: true
        }],
    status: [
        {
            args: "false effect:statusEffect unit:unit duration:number",
            description: "Applies (effect) to (unit) for (duration) seconds.",
            isWorldProc: true
        }, {
            args: "true effect:statusEffect unit:unit",
            description: "Removes (effect) from (unit).",
            isWorldProc: true
        }, {
            args: "apply effect:statusEffect unit:unit duration:number",
            description: "Applies (effect) to (unit) for (duration) seconds.",
            replace: ["status false %2 %3 %4"],
            isWorldProc: true
        }, {
            args: "clear effect:statusEffect unit:unit",
            description: "Removes (effect) from (unit).",
            replace: ["status true %2 %3"],
            isWorldProc: true
        },
    ],
    spawnwave: [{
            args: "x:number y:number natural:boolean",
            description: "Spawns a wave at (x,y).",
            isWorldProc: true
        }],
    setrule: [
        {
            args: "rule:rule value:number",
            description: "Sets (rule) to (value).",
            isWorldProc: true
        }, {
            args: "mapArea x:number y:number width:number height:number",
            description: "Sets the map area.",
            isWorldProc: true
        },
    ],
    message: [
        {
            args: "notify",
            description: "Flushes the message buffer to a notification.",
            isWorldProc: true
        }, {
            args: "announce duration:number",
            description: "Flushes the message buffer to an announcement for (duration) seconds.",
            isWorldProc: true
        }, {
            args: "toast duration:number",
            description: "Flushes the message buffer to a toast for (duration) seconds.",
            isWorldProc: true
        }, {
            args: "mission",
            description: "Flushes the message buffer to the mission text.",
            isWorldProc: true
        },
    ],
    cutscene: [
        {
            args: "pan x:number y:number speed:number",
            description: "Pans to (x,y) at (speed).",
            isWorldProc: true
        }, {
            args: "zoom level:number",
            description: "Sets the zoom level to (level).",
            isWorldProc: true
        }, {
            args: "stop",
            description: "Ends the cutscene, returning control to players.",
            isWorldProc: true
        },
    ],
    explosion: [{
            args: "team:team x:number y:number radius:number damage:number affectsAir:boolean affectsGround:boolean isPiercing:boolean",
            description: "Creates an explosion at coordinates (x,y) that damages enemies of (team).",
            isWorldProc: true
        }],
    setrate: [{
            args: "ipt:number",
            description: "Sets the instructions per tick to (ipt).",
            isWorldProc: true
        }],
    fetch: [
        {
            args: "buildCount output:*number team:team type:buildingType",
            description: "Fetches (thing) and stores it in (output).",
            replace: ["fetch %1 %2 %3 0 %4"],
            isWorldProc: true
        }, {
            args: "buildCount output:*number team:team 0 type:buildingType",
            description: "Default fetch buildCount signature with extra 0. Included for compatibility.",
            isWorldProc: true
        }, {
            args: "thing:fetchableCount output:*number team:team",
            description: "Fetches (thing) for (team) and stores it in (output).",
            isWorldProc: true
        }, {
            args: "unit output:*unit team:team n:number",
            description: "Fetches the (n)th unit on (team) and stores it in (output).",
            isWorldProc: true
        }, {
            args: "player output:*unit team:team n:number",
            description: "Fetches the (n)th player on (team) and stores it in (output).",
            isWorldProc: true
        }, {
            args: "core output:*building team:team n:number",
            description: "Fetches the (n)th core on (team) and stores it in (output).",
            isWorldProc: true
        }, {
            args: "build output:*building team:team n:number type:buildingType",
            description: "Fetches the (n)th building on (team) of type (type) and stores it in (output).",
            isWorldProc: true
        }
    ],
    getflag: [{
            args: "output:*any flag:string",
            description: "Gets the value of flag (flag) and stores it in (output).",
            isWorldProc: true
        }],
    setflag: [{
            args: "flag:string value:any",
            description: "Sets the value of flag (flag) to (value)",
            isWorldProc: true
        }],
});
export const compilerCommands = processCompilerCommands({
    '&for': {
        stackElement: true,
        overloads: [
            {
                args: "variable:variable in lowerBound:number upperBound:number {",
                description: "&for in loops allow you to emit the same code multiple times but with a number incrementing. (variable) is set as a compiler constant and goes from (lowerBound) through (upperBound) inclusive, and the code between the bracket is emitted once for each value..",
                onbegin({ line }) {
                    const args = splitLineIntoArguments(line.text);
                    const lowerBound = parseInt(args[3]);
                    const upperBound = parseInt(args[4]);
                    if (isNaN(lowerBound) || lowerBound < 0)
                        CompilerError.throw("for loop invalid bound", { bound: "lower", value: args[3] });
                    if (isNaN(upperBound) || upperBound < 0)
                        CompilerError.throw("for loop invalid bound", { bound: "upper", value: args[4] });
                    if ((upperBound - lowerBound) > maxLoops)
                        CompilerError.throw("for loop too many loops", { numLoops: upperBound - lowerBound });
                    if ((upperBound - lowerBound) < 0)
                        CompilerError.throw("for loop negative loops", { numLoops: upperBound - lowerBound });
                    return {
                        element: {
                            type: "&for",
                            elements: range(lowerBound, upperBound, true),
                            variableName: args[1],
                            loopBuffer: [],
                            line
                        },
                        compiledCode: []
                    };
                },
                onpostcompile({ compiledOutput, stack }) {
                    topForLoop(stack)?.loopBuffer.push(...compiledOutput);
                    return {
                        modifiedOutput: []
                    };
                },
                onend({ removedElement, stack }) {
                    const compiledCode = [];
                    for (const el of removedElement.elements) {
                        compiledCode.push(...removedElement.loopBuffer.map(line => new Statement(replaceCompilerConstants(line.text, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")), line.sourceFilename, line.sourceLineNumber, line.sourceText, replaceCompilerConstants(line.cleanedSourceText, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")))));
                    }
                    return { compiledCode };
                },
            }, {
                args: "variable:variable of ...elements:any {",
                description: "&for of loops allow you to emit the same code multiple times but with a value changed. (variable) is set as a compiler constant and goes through each element of (elements), and the code between the brackets is emitted once for each value.",
                onbegin({ line }) {
                    const args = splitLineIntoArguments(line.text);
                    return {
                        element: {
                            type: "&for",
                            elements: args.slice(3, -1),
                            variableName: args[1],
                            loopBuffer: [],
                            line
                        },
                        compiledCode: []
                    };
                },
                onpostcompile({ compiledOutput, stack }) {
                    topForLoop(stack)?.loopBuffer.push(...compiledOutput);
                    return {
                        modifiedOutput: []
                    };
                },
                onend({ removedElement, stack }) {
                    const compiledCode = [];
                    for (const el of removedElement.elements) {
                        compiledCode.push(...removedElement.loopBuffer.map(line => new Statement(replaceCompilerConstants(line.text, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")), line.sourceFilename, line.sourceLineNumber, line.sourceText, replaceCompilerConstants(line.cleanedSourceText, new Map([[removedElement.variableName, el]]), hasElement(stack, "&for")))));
                    }
                    return { compiledCode };
                },
            }
        ]
    },
    "&if": {
        stackElement: true,
        overloads: [{
                args: "variable:boolean {",
                description: "&if statements allow you to emit code only if a compiler const is true.",
                onbegin({ line }) {
                    const args = splitLineIntoArguments(line.text);
                    let isEnabled = false;
                    if (args.length == 3) {
                        if (!isNaN(parseInt(args[1]))) {
                            isEnabled = !!parseInt(args[1]);
                        }
                        else if (args[1] == "true") {
                            isEnabled = true;
                        }
                        else if (args[1] == "false") {
                            isEnabled = false;
                        }
                        else {
                            Log.printMessage("if statement condition not boolean", { condition: args[1] });
                            isEnabled = true;
                        }
                    }
                    return {
                        element: {
                            type: "&if",
                            line,
                            enabled: isEnabled
                        },
                        compiledCode: []
                    };
                },
                onpostcompile({ compiledOutput, stack }) {
                    if (hasDisabledIf(stack)) {
                        return {
                            modifiedOutput: []
                        };
                    }
                    else {
                        return {
                            modifiedOutput: compiledOutput
                        };
                    }
                },
            }]
    },
    'namespace': {
        stackElement: true,
        overloads: [
            {
                args: "name:string {",
                description: "[WIP] Prepends _(name)_ to all variable names inside the block to prevent name conflicts. Doesn't work that well.",
                onbegin({ line }) {
                    const args = splitLineIntoArguments(line.text);
                    return {
                        element: {
                            name: args[1],
                            type: "namespace",
                            line
                        },
                        compiledCode: []
                    };
                },
                onpostcompile({ compiledOutput, stack }) {
                    return {
                        modifiedOutput: compiledOutput.map(line => {
                            const commandDefinition = getCommandDefinition(line.text);
                            if (!commandDefinition) {
                                Log.dump(line);
                                throw new Error("Line compiled to invalid statement. This is an error with MLOGX.");
                            }
                            return new Statement(addNamespacesToLine(line.args, commandDefinition, stack), line.sourceFilename, line.sourceLineNumber, line.sourceText, line.cleanedSourceText);
                        })
                    };
                },
            }
        ]
    }
});
