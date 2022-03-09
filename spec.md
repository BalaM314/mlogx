Specification for stdlib

This project is a work in progress! These instructions are not complete!

## Guide to making programs
This guide assumes you already know how to make mlog programs, but are frustrated when you try to make larger projects.
Place your .mlog or .mlogx(supports the extended instruction set in this document) files in /src.
Running the compiler with `node compiler/compile.js` transpiles .mlogx files into .mlog files, and then combines all your separate files into one(out.mlog), which you paste into a processor in-game.

Need help? I'm BalaM314#4781, you can ping me in the #logic channel of the official Mindustry discord.

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

`call [function_name]`

Calls a function. Equivalent instructions:

`set _stack1 @counter`

`op add _stack1 _stack1 3`

`jump [function_name] always`



`increment [variable_name] [amount(5)]`

Increments a variable by a number. Equivalent instructions:

`op add [variable_name] [variable_name] [amount]`



`return`

Returns from a function. Equivalent instructions:

`set @counter _stack1`



`throw [error_message]`

Throws an error. Equivalent instructions:

`set _err [error_message]`

`call _err`



More coming Soon™.

## List of variables
<_stdout>: default [Message] to output messages. Standard output.

<_stderr>: default [Message] to output errors. Can be the same as <_stdout>.

<_stack1>: Contains an address that should be jumped back to once a function call is complete. You should never need to set this, the `call` instruction does it for you.

## List of functions

_count_building_type(_building_type) -> _num_buildings

Returns the amount of linked buildings of a particular type.

Instruction count: 4+6*@links



_err(_err)

Outputs a message in red to <stderr> and terminates.

More coming Soon™.