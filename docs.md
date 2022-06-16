Documentation for mlogx(mindustry logic extended)

This project is a work in progress! These instructions are not complete!

## Guide to making programs
This guide assumes you already know how to make mlog programs, but are frustrated when you try to make larger projects. You also need basic knowledge of the command line.

Need help? I'm BalaM314#4781, you can ping me in the #logic channel of the official Mindustry discord or in .io community.

## Installation
Prerequisites: Node.JS and npm(which should be bundled with node).

1. `npm i -g mlogx`

Run `mlogx` with no arguments. You should get the message "Please specify a project or directory to compile in.".

## Usage

### Running the compiler

Run `mlogx`, passing the thing to compile as the first argument. It can either be a directory with .mlogx files in it, a project with .mlogx files in src/, or a single .mlogx file.
You can also run --watch to compile a directory automatically whenever a file in it changes. I recommend running this in the parent directory of all your projects.

### For larger projects
Run `mlogx --init [projectname]`, which will create a new project(directory) named \[projectname].
Place your source files in `src/`. They will be compiled into `build/` and combined into `out.mlog`.

Note that you don't *need* to use mlogx, you can call functions and bundle your files with vanilla MLOG(it'll just be annoying to write function calls without `call`).

Note: Without jump or call statements, the only file executed is main.mlog(x). Your other files should contain functions or subroutines that you can call.

### For standalone files
Create a folder and place one or more .mlogx files inside. They will be compiled into .mlog files and placed in the same directory.

### Standard Library
The standard library is just a bunch of functions you may find useful. You can include them by adding the name of the function you want to the compilerOptions.include array in your project's config.json.

## Functions

A function is simply a jump label that expects a variable to be set, can run some code, and then use @counter and <\_stack1> to jump back to where you called them.

## List of custom instructions

mlogx has extra instructions to make writing code easier.

### call

`call [function_name]`

Calls a function. Equivalent instructions:

`set _stack1 @counter`

`op add _stack1 _stack1 3`

`jump [function_name] always`

### return

`return`

Returns from a function. Equivalent instructions:

`set @counter _stack1`

### sensor shorthand

`sensor building1.property`

A shorthand for sensor statements. Equivalent instructions:

`sensor building1.property building1 @property`

## Preprocessor directives

WARNING: THESE MAY NOT WORK.

They're cool so I added them.

`#program_type [append, main, never]`

never: Causes a file to never be included in the compiled program. Must be on the very first line.

main: Specifies that a file is a main program, and functions should be appended to it.

append: Specifies that a file should be appended to the main program in a project.

`#require [var1, var2...]`

A list of variables you want to include.

`#include [file1, file2, file3]`

List of stdlib functions that you want to include.

`#function functionName(arg1:type, arg2:type) -> outputVar`

Specifies that a program is a function. Used for type checking.
## Requireable vars
Not prefixed with an underscore, so take note if you're using them!

`cookie`

Generates a random cookie based on the processor's x and y coordinates. Useful for flagging units.

`core`

[NYI] Uses a unit to ulocate the nearest core. Errors if no units are available.

## Namespaces

Cause all variables inside to be prefixed with \_name_.

```mlogx
set x 5
namespace amogus {
  set x 2
  print x #will output 2
  label1: #will compile to _amogus_label1
  jump label1 #NYI will not work.
}
print x #will output 5
```

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

`name`: The name of your project from config.json

`authors`: List of authors from config.json

`$_[any mindustry icon name]`: The Unicode character that displays as the icon in-game. Example: $\_lead will get replaced with <> (U+F837), the char for lead.
