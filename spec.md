Specification for stdlib and mlogx(mindustry logic extended)

This project is a work in progress! These instructions are not complete!

## Guide to making programs
This guide assumes you already know how to make mlog programs, but are frustrated when you try to make larger projects.

Need help? I'm BalaM314#4781, you can ping me in the #logic channel of the official Mindustry discord.

### For larger projects
Place your .mlog or .mlogx(supports the extended instruction set in this document) files in /src.
Running the compiler with `node compiler/compile.js` transpiles .mlogx files into .mlog files, and then combines all your separate files into one(out.mlog), which you paste into a processor in-game.

Note that you don't *need* to use mlogx, you can call functions and bundle your files with vanilla MLOG(it'll just be annoying to write function calls without `call`).

Note: Without jump or call statements, the only file executed is main.mlog(x). Your other files should contain functions or subroutines that you can call. As this project is a WIP, currently all functions from the stdlib are included in your output file, however, they don't make your program any slower unless they are executed. This is temporary, but I need to make a linker first, which is... non-trivial.

### For standalone files
Create a folder and place one or more .mlogx files inside. They will be compiled into .mlog files and placed in the same directory.

All functions from the stdlib are included in your output file, however, they don't make your program any slower unless they are executed. This is temporary, but I need to make a linker first, which is... non-trivial.


## Functions
yeah we have functions! See count_block_type.mlogx for an example.

Builtin function names start with an underscore so they don't interfere with your labels and/or your own functions.

Example of format used in this doc:

_function_name(_argument_name) -> _output_variable_name

Description of what the function does.

Before calling a function with `call`, make sure to set its input variable.
Functions do not check if the input is set, for speed.

"Under the hood", functions are simply a jump label that expects a variable to be set, can write to a variable, and use @counter and <stack1> to jump back to where you called them.

## List of custom instructions

mlogx has extra instructions to make writing code easier.

### call

`call [function_name]`

Calls a function. Equivalent instructions:

`set _stack1 @counter`

`op add _stack1 _stack1 3`

`jump [function_name] always`

### increment

`increment [variable_name] [amount(5)]`

Increments a variable by a number. Equivalent instructions:

`op add [variable_name] [variable_name] [amount]`

### return

`return`

Returns from a function. Equivalent instructions:

`set @counter _stack1`

### throw

`throw [error_message]`

Throws an error. Equivalent instructions:

`set _err [error_message]`

`call _err`

## List of variables
_stdout: default [Message] to output messages. Standard output.

_stderr: default [Message] to output errors. Can be the same as _stdout.

_stack1: Contains an address that should be jumped back to once a function call is complete. You should never need to set this, the `call` instruction does it for you.

## List of functions

_count_building_type(_building_type) -> _num_buildings

Returns the amount of linked buildings of a particular type.

Instruction count: 4+6*@links



_err(_err)

Outputs a message in red to _stderr and terminates.

Yes I know it's confusing that the function and parameter have the same name. :cringe:



_count_unit(_unit_type) -> _num_units

Returns the amount of (alive) units of a particular type.



_flag_unit(_unit_type) -> @unit

Binds and flags an unused unit.

WARNING: will block if no units are available.

More coming Soon™.

## Preprocessor directives

They're cool so I added them.

`#program_type [append, main, never]`

never: Causes a file to never be included in the compiled program. Must be on the very first line. Useful for files like all_commands.mlogx.

main: Specifies that a file is a main program, and functions should be appended to it.

append: Specifies that a file should be appended to the main program in a project.

`#require [var1, var2...]`

A list of variables you want to include.

`#function functionName(arg1, arg2) -> outputVar`

Specifies that a program is a function. Eventually will be used for intelligence.
## Requireable vars
Not prefixed with an underscore, so take note if you're using them!

`cookie`

Generates a random cookie based on the processor's x and y coordinates. Useful for flagging units.

`core`

[NYI] Uses a unit to ulocate the nearest core. Errors if no units are available.


