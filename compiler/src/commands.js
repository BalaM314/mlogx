import { CompilerError, Log } from "./classes.js";
import { GenericArgs, maxLoops, shortOperandMapping } from "./consts.js";
import { addNamespacesToLine, getCommandDefinition, hasDisabledIf, processCommands, processCompilerCommands, range, replaceCompilerConstants, splitLineIntoArguments, topForLoop, typeofArg } from "./funcs.js";
import { PortingMode } from "./types.js";
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
            description: "Adds a (amount) to (variable)."
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
            description: "Throws (error). May or may not work."
        }],
    uflag: [{
            args: "type:type",
            replace: [
                "set unit_type %1",
                "op add @counter _stack1 1",
                "jump flag_unit always",
            ],
            description: "Binds and flags a unit of type (type). Requires you to include \"flag_unit\"."
        }],
    read: [{
            args: "output:*number cell:building index:number",
            description: "Reads a value at index (index) from memory cell (cell) and outputs to (output)."
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
            args: "image x:number y:number image:type size:number rotation:number",
            description: "Displays an image of (image) centered at (x,y) with size (size) and rotated (rotation) degrees."
        },
    ],
    print: [{
            args: "message:any",
            description: "Prints (message) to the message buffer."
        }],
    drawflush: [{
            args: "display:building",
            description: "Flushes queued draw instructions to (display)."
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
            description: "Gets the (n)th linked building. Useful when looping over all buildings."
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
            description: "Finds units of specified type within the range of (turret).",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax && ((args[1] == args[2] && args[2] == args[3]) || (args[2] == "any" && args[3] == "any")))
                    return `${args[0]} ${args[1]} ${args[4]} ${args[5]} ${args[6]} ${args[7]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "targetClass:targetClass sortCriteria:unitSortCriteria turret:building sortOrder:number output:*unit",
            description: "Finds units of specified type within the range of (turret).",
            replace: [
                "radar %1 any any %2 %3 %4 %5"
            ]
        }, {
            args: "targetClass:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
            description: "Finds units of specified type within the range of (turret).",
            replace: [
                "radar %1 any any %2 %3 %4 %5"
            ]
        }, {
            args: "targetClass:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number turret:building output:*unit",
            description: "Finds units of specified type within the range of (turret).",
            replace: [
                "radar %1 %2 %3 %4 %6 %5 %7"
            ]
        },
    ],
    sensor: [
        {
            args: "output:*any building:building value:type",
            description: "Gets information about (building) and outputs to (output), does not need to be linked or on the same team.",
            port(args, mode) {
                if (args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
                    return `sensor ${args[1]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "output:*any unit:unit value:type",
            description: "Gets information about (unit) and outputs to (output), does not need to be on the same team.",
            port(args, mode) {
                if (args[1] == `${args[2]}.${args[3].slice(1)}` && mode >= PortingMode.shortenSyntax)
                    return `sensor ${args[1]}`;
                else
                    return args.join(" ");
            },
        }, {
            args: "output:*any",
            replace: (args) => {
                if (args[1].match(/^([\w@_$-]+?)\.([\w@_$-]+?)$/i)) {
                    const [, target, property] = args[1].match(/^([\w@_$-]+?)\.([\w@_$-]+?)$/i);
                    if (target == null || property == null)
                        throw new CompilerError("Impossible.");
                    return [`sensor ${args[1]} ${target == "unit" ? "@unit" : target} @${property}`];
                }
                else {
                    throw new CompilerError(`Invalid command\n\tat ${args.join(" ")}\nCorrect usage: \`sensor foreshadow1.shootX\``);
                }
            },
            description: "sensor turret.x instead of sensor turret.x turret @x"
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
                if (GenericArgs.has(args[2].slice(1))) {
                    return [`set ${args[1]} ${args[3]}`];
                }
                else {
                    throw new CompilerError(`Invalid type "${args[2].slice(1)}", valid types are ${Object.keys(GenericArgs).join(", ")}`);
                }
            },
            getVariablesDefined: (args) => {
                if (GenericArgs.has(args[2].slice(1))) {
                    return [[args[1], args[2].slice(1)]];
                }
                else {
                    throw new CompilerError(`Invalid type "${args[2].slice(1)}", valid types are ${Object.keys(GenericArgs).join(", ")}`);
                }
            }
        }, {
            args: "variable:*number arg1:number operand:sOperandDouble arg2:number",
            description: "Alternative op syntax",
            replace: (args) => [`op ${shortOperandMapping[args[3]]} ${args[1]} ${args[2]} ${args[4]}`]
        }
    ],
    op: [
        {
            args: "operand:operandSingle output:*number arg1:number zero:0?",
            description: "Performs an operation on (arg1), storing the result in (output).",
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
            description: "Performs an operation between (arg1) and (arg2), storing the result in (output).",
            port(args, mode) {
                if (mode >= PortingMode.shortenSyntax) {
                    if (args[2] == args[3])
                        return `op ${args[1]} ${args[2]} ${args[4]}`;
                }
                return args.join(" ");
            },
        }, {
            args: "operand:operandDouble output:*number arg1:number",
            description: "Performs an operation on (arg1) and (output), storing the result in (output).",
            replace: ["op %1 %2 %2 %3"]
        }, {
            args: "operand:operandSingle arg1:*number",
            description: "Performs an operation on arg1, mutating it. Example: `op abs xDiff`",
            replace: ["op %1 %2 %2 0"]
        }
    ],
    wait: [{
            args: "seconds:number",
            description: "Waits for (seconds) seconds."
        }],
    lookup: [{
            args: "type:lookupType output:*any n:number",
            description: "Looks up the (n)th item, building, fluid, or unit type."
        }],
    end: [{
            args: "",
            description: "Goes back to the start."
        }],
    jump: [
        {
            args: "jumpAddress:jumpAddress always zero:0? zero:0?",
            description: "Jumps to an address or label.",
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
            args: "jumpAddress:jumpAddress operandTest:operandTest var1:any var2:any",
            description: "Jumps to an address or label if a condition is met.",
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
            description: "Jumps to an address or label.",
            replace: ["jump %1 always 0 0"]
        },
    ],
    ubind: [
        {
            args: "unitType:type",
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
            description: "Tells the bound unit to continue current actions, except moving."
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
            args: "itemTake building:building item:type amount:number",
            description: "Tells the bound unit to take at most (amount) of (item) from (building)."
        }, {
            args: "payDrop",
            description: "Tells the bound unit to drop its payload."
        }, {
            args: "payTake takeUnits:boolean",
            description: "Tells the bound unit to pick up a payload and if to take units."
        }, {
            args: "payEnter",
            description: "Tells the bound unit to enter a building(usually a reconstructor)."
        }, {
            args: "mine x:number y:number",
            description: "Tells the unit to mine at (x,y)"
        }, {
            args: "flag flag:number",
            description: "Sets the flag of the bound unit."
        }, {
            args: "build x:number y:number buildingType:type rotation:number config:any",
            description: "Tells the unit to build (block) with (rotation) and (config) at (x,y)."
        }, {
            args: "getBlock x:number y:number buildingType:*type building:*building",
            description: "Gets the building type and building at (x,y) and outputs to (buildingType) and (building)."
        }, {
            args: "within x:number y:number radius:number output:*boolean",
            description: "Checks if the unit is within (radius) tiles of (x,y) and outputs to (output)."
        },
    ],
    uradar: [
        {
            args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sortOrder:number output:*any",
            description: "Finds units of specified type within the range of the bound unit.",
            replace: [
                "uradar %1 %2 %3 %4 0 %5 %6"
            ]
        }, {
            args: "targetClass1:targetClass targetClass2:targetClass targetClass3:targetClass sortCriteria:unitSortCriteria sillyness:0 sortOrder:number output:*any",
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
            description: "Finds units of specified type within the range of the bound unit.",
            replace: [
                "uradar %1 any any %2 0 %3 %4"
            ]
        },
    ],
    ulocate: [
        {
            args: "ore ore:type outX:*number outY:*number found:*boolean",
            description: "Finds ores of specified type near the bound unit.",
            replace: ["ulocate ore core _ %2 %3 %4 %5 _"]
        }, {
            args: "spawn outX:*number outY:*number found:*boolean",
            description: "Finds enemy spawns near the bound unit.",
            replace: ["ulocate spawn core _ _ %2 %3 %4 _"]
        }, {
            args: "damaged outX:*number outY:*number found:*boolean building:*building",
            description: "Finds damaged buildings near the bound unit.",
            replace: ["ulocate damaged core _ _ %2 %3 %4 %5"]
        }, {
            args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
            description: "Finds buildings of specified group near the bound unit.",
            replace: ["ulocate building %2 %3 _ %4 %5 %6 %7"]
        }, {
            args: "oreOrSpawnOrAmogusOrDamagedOrBuilding:any buildingGroup:buildingGroup enemy:boolean ore:type outX:*number outY:*number found:*boolean building:*building",
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
                            Log.err(`Cannot port ulocate statement "${args.join(" ")}" because it is invalid.`);
                    }
                }
                return args.join(" ");
            },
        }
    ],
});
export const compilerCommands = processCompilerCommands({
    '&for': {
        stackElement: true,
        overloads: [
            {
                args: "variable:*any in lowerBound:number upperBound:number {",
                description: "&for in loops allow you to emit the same code multiple times but with a number incrementing. (variable) is set as a compiler constant and goes from (lowerBound) through (upperBound) inclusive.",
                onbegin(args, line) {
                    const lowerBound = parseInt(args[3]);
                    const upperBound = parseInt(args[4]);
                    if (isNaN(lowerBound))
                        throw new CompilerError(`Invalid for loop syntax: lowerBound(${lowerBound}) is invalid`);
                    if (isNaN(upperBound))
                        throw new CompilerError(`Invalid for loop syntax: upperBound(${upperBound}) is invalid`);
                    if (lowerBound < 0)
                        throw new CompilerError(`Invalid for loop syntax: lowerBound(${upperBound}) cannot be negative`);
                    if ((upperBound - lowerBound) > maxLoops)
                        throw new CompilerError(`Invalid for loop syntax: number of loops(${upperBound - lowerBound}) is greater than 200`);
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
                oninblock(compiledOutput, stack) {
                    topForLoop(stack)?.loopBuffer.push(...compiledOutput);
                    return {
                        compiledCode: []
                    };
                },
                onend(line, removedStackElement) {
                    const compiledCode = [];
                    for (const el of removedStackElement.elements) {
                        compiledCode.push(...removedStackElement.loopBuffer.map(line => [replaceCompilerConstants(line[0], new Map([[removedStackElement.variableName, el]])), {
                                text: replaceCompilerConstants(line[1].text, new Map([
                                    [removedStackElement.variableName, el]
                                ])),
                                lineNumber: line[1].lineNumber
                            }]));
                    }
                    return { compiledCode };
                },
            }, {
                args: "variable:*any of ...elements:any {",
                description: "&for in loops allow you to emit the same code multiple times but with a value changed. (variable) is set as a compiler constant and goes through each element of (elements).",
                onbegin(args, line) {
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
                oninblock(compiledOutput, stack) {
                    topForLoop(stack)?.loopBuffer.push(...compiledOutput);
                    return {
                        compiledCode: []
                    };
                },
                onend(line, removedStackElement) {
                    const compiledCode = [];
                    for (const el of removedStackElement.elements) {
                        compiledCode.push(...removedStackElement.loopBuffer.map(line => [replaceCompilerConstants(line[0], new Map([[removedStackElement.variableName, el]])), {
                                text: replaceCompilerConstants(line[1].text, new Map([
                                    [removedStackElement.variableName, el]
                                ])),
                                lineNumber: line[1].lineNumber
                            }]));
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
                onbegin(args, line) {
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
                            Log.warn(`condition in &if statement(${args[1]}) is not "true" or "false".`);
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
                oninblock(compiledOutput, stack) {
                    if (hasDisabledIf(stack)) {
                        return {
                            compiledCode: []
                        };
                    }
                    else {
                        return {
                            compiledCode: compiledOutput
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
                description: "[WIP] Prepends _(name)_ to all variable names to prevent name conflicts.",
                onbegin(args, line) {
                    return {
                        element: {
                            name: args[1],
                            type: "namespace",
                            line
                        },
                        compiledCode: []
                    };
                },
                oninblock(compiledOutput, stack) {
                    return {
                        compiledCode: compiledOutput.map(line => {
                            const commandDefinition = getCommandDefinition(line[0]);
                            if (!commandDefinition) {
                                throw new Error("This should not be possible.");
                            }
                            return [addNamespacesToLine(splitLineIntoArguments(line[0]), commandDefinition, stack), line[1]];
                        })
                    };
                },
            }
        ]
    }
});
export default commands;
