Specification for stdlib and mlogx(mindustry logic extended)

This project is a work in progress! These instructions are not complete!

## Guide to making programs
This guide assumes you already know how to make mlog programs, but are frustrated when you try to make larger projects.

Need help? I'm BalaM314#4781, you can ping me in the #logic channel of the official Mindustry discord.

### For larger projects
Run `mlogx --init [projectname]`, which will create a new project(directory) named [projectname].
Running the compiler with `mlogx [projectname]` in the project's parent directory transpiles .mlogx files into .mlog files, and then combines all your separate files into one(out.mlog), which you paste into a processor in-game.

Note that you don't *need* to use mlogx, you can call functions and bundle your files with vanilla MLOG(it'll just be annoying to write function calls without `call`).

Note: Without jump or call statements, the only file executed is main.mlog(x). Your other files should contain functions or subroutines that you can call.

### For standalone files
Create a folder and place one or more .mlogx files inside. They will be compiled into .mlog files and placed in the same directory.

### Standard Library
The standard library is just a bunch of functions you may find useful. You can include them by adding the name of the function you want to the compilerOptions.include array in your project's config.json.

## Functions

A function is simply a jump label that expects a variable to be set, can run some code, and then use @counter and <_stack1> to jump back to where you called them.

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

```
print [error_message]
printflush stderr
end
```

## Preprocessor directives

They're cool so I added them.

`#program_type [append, main, never]`

never: Causes a file to never be included in the compiled program. Must be on the very first line.

main: Specifies that a file is a main program, and functions should be appended to it.

append: Specifies that a file should be appended to the main program in a project.

`#require [var1, var2...]`

A list of variables you want to include.

`#include [file1, file2, file3]`

List of stdlib functions that you want to include.

`#function functionName(arg1, arg2) -> outputVar`

Specifies that a program is a function. Eventually will be used for intelligence.
## Requireable vars
Not prefixed with an underscore, so take note if you're using them!

`cookie`

Generates a random cookie based on the processor's x and y coordinates. Useful for flagging units.

`core`

[NYI] Uses a unit to ulocate the nearest core. Errors if no units are available.


## Compiler variables
Replace bits of your program with variables defined by the compiler.

Use the compilerVariables object in settings.json to define custom variables.

Example:
"compilerVariables": {
	"name": "ExampleProject by [#3141FF]BalaM314"
}

Code like `print "$name"` will get replaced with `print "ExampleProject by [#3141FF]BalaM314"`.

### Builtin compiler variables

`filename`: The filename of the file being compiled(minus the .mlogx at the end).

`$_[any mindustry icon name]`: The Unicode character that displays as the icon in-game. Example: $_lead will get replaced with <> (U+F837), the char for lead.