Documentation for mlogx(Mindustry Logic Extended)

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
Run `mlogx init [projectname]`, which will create a new project(directory) named \[projectname].
Place your source files in `src/`. They will be compiled into `build/` and combined into `out.mlog`.

Note that you don't *need* to use mlogx, you can call functions and bundle your files with vanilla MLOG(but why though, all valid mlog is valid mlogx).

Without jump or call statements, the only file executed is main.mlog(x). Your other files should contain functions or subroutines that you can call.

### For standalone files
Create a folder and place one or more .mlogx files inside. They will be compiled into .mlog files and placed in the same directory.

# List of features

## Statement validation
mlogx will read through each instruction in your program and make sure each statement is valid. Lines like `amogus` or `print Hello world!` or `ulocate building core core.x core.y core.found core` will cause an error.

## Type checking
mlogx remembers the type of all variables, so you will get an error if you:
* use a variable that doesn't exist
* use a variable with incorrect type
* set a variable with two different types
* use a jump label that doesn't exist
* define a jump label twice

## List of custom instructions

mlogx has extra instructions to make writing code easier.

## Shorthands
Lots of mlog instructions have meaningless arguments, questionable argument ordering, or are just weird. The shorthands below aim to fix those problems, and make writing code faster.

### sensor shorthand
`sensor building1.property`

A shorthand for sensor statements. Equivalent instructions:

`sensor building1.property building1 @property`
### radar shorthands
`radar enemy distance hail1 0 enemy` => `radar enemy any any distance hail1 0 enemy`

Lets you avoid needing to write "enemy" 3 times.

`radar enemy distance 0 hail1 enemy` => `radar enemy any any distance hail1 0 enemy`

Sort order should come before the turret.
### uradar shorthands
`uradar enemy any any distance 0 enemy` => `uradar enemy any any distance 0 0 enemy`

The regular syntax for the uradar command has a meaningless zero.

`radar enemy distance 0 enemy` => `uradar enemy any any distance 0 0 enemy`

Lets you avoid needing to write "enemy" 3 times.
### set type annotation
`set target :building null` => `set target null`

Allows you to specify the type of a variable.
### op shorthands
`op cos x theta` => `op cos x theta 0`

For single-argument operations.

`op add x 5` => `op add x x 5`

For two-argument operations.

`op abs xDiff` => `op abs xDiff xDiff 0`

For single-argument operations. Mutates the variable.

### jump shorthand
`jump label` => `jump label always 0 0`

Shorthand for jump always.

### ulocate shorthand
The following shorthands all remove meaningless arguments from the ulocate command.

`ulocate ore @copper ore.x ore.y ore.found` => `ulocate ore core _ @copper ore.x ore.y ore.found _`

`ulocate spawn spawn.x spawn.y spawn.found` => `ulocate spawn core _ _ spawn.x spawn.y spawn.found _`

`ulocate damaged build.x build.y build.found build` => `ulocate damaged core _ _ build.x build.y build.found build`

`ulocate building turret true turret.x turret.y turret.found turret` => `ulocate building turret true _ turret.x turret.y turret.found turret`

## New instructions
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

## Compiler constants
Replace bits of your program with constants defined by the compiler.

Use the compilerConsts object in settings.json to define custom constants.

Example:
"compilerConsts": {
	"name": "ExampleProject by [#3141FF]BalaM314",
  "buildings": ["mender1", "mender2", "projector1"]
}

Code like `print "$name"` will get replaced with `print "ExampleProject by [#3141FF]BalaM314"`.

Compiler consts can also be an array: `print "Managed buildings: $buildings"` gets replaced with `print "Managed buildings: mender1 mender2 mender3"`

### Builtin compiler consts

`filename`: The filename of the file being compiled(minus the .mlogx at the end).

`name`: The name of your project from config.json

`authors`: List of authors from config.json

`$_[any mindustry icon name]`: The Unicode character that displays as the icon in-game. Example: `$_lead` will get replaced with `` (U+F837), the char for lead.

\[NYI\] `oct.itemCapacity` and other stuff like that will be added eventually.

## &for loops

Possibly the most useful feature in this project. &for loops allow you to repeat code with small bits changed(using compiler constants).

You can use this for automatic loop unrolling, to make large sections of mostly repeated code easier to change and read, or to be able to easily adapt [a program](https://github.com/BalaM314/mlog/blob/main/single_files/payEnter/multiPayenter.mlogx) to handle an arbitrary number of buildings.

There are two types: `&for in` and `&for of`.

### &for in loops

&for in loops set the loop variable to each value between two numbers.

Syntax:
```
&for [variable] in [lowerBound] [upperBound] {
  #statements...
}
```

Example:
```
&for i in 0 4 {
  set x_$i 5
}
```
Compiles to:
```
set x_0 5
set x_1 5
set x_2 5
set x_3 5
set x_4 5
```

### &for of loops
&for of loops set the loop variable to arbitrary values.

Syntax:
```
&for [variable] of [things...] {
  #statements...
}
```

Example:
```
&for building of mender1 mender2 mender3 mender4 projector1 projector2 {
  control enabled $building isActive
}
```
Compiles to:
```
control enabled mender1 isActive
control enabled mender2 isActive
control enabled mender3 isActive
control enabled mender4 isActive
control enabled projector1 isActive
control enabled projector2 isActive
```

This works nicely with compiler const arrays. Example:

```
&for building of $buildingsToManage {
  sensor $building.health
  sensor $building.maxHealth
  jump mend lessThan $building.health $building.maxHealth
}
```
Compiles to:
```
sensor mender1.health
sensor mender1.maxHealth
jump mend lessThan mender1.health mender1.maxHealth
sensor mender2.health
sensor mender2.maxHealth
jump mend lessThan mender2.health mender2.maxHealth
sensor mender3.health
sensor mender3.maxHealth
jump mend lessThan mender3.health mender3.maxHealth
sensor projector1.health
sensor projector1.maxHealth
jump mend lessThan projector1.health projector1.maxHealth
sensor projector2.health
sensor projector2.maxHealth
jump mend lessThan projector2.health projector2.maxHealth
```
if buildingsToManage is set to \["mender1", "mender2", "mender3", "projector1", "projector2"]

## Functions

A function is simply a jump label that expects a variable to be set, can run some code, and then use @counter and <\_stack1> to jump back to where you called them.

## Standard Library
The standard library is just a bunch of functions you may find useful. You can include them by adding the name of the function you want to the compilerOptions.include array in your project's config.json.

## Preprocessor directives

Warning: may not work correctly.

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

Note: this feature is incomplete and is somewhat useless as you cannot reference external variables.

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

## Inline functions
TODO