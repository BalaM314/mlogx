A transpiler for Mindustry Logic.

Type checks your code before it runs, so you don't waste 5 minutes debugging because you wrote "ubind unittype" instead of "ubind unitType".

Standardizes function calls, variable names, etc. Has functions and an extended instruction set, see [spec.md](spec.md) for more information.

You can use this to manage large projects and split your code into multiple files.

This project is now usable, but may be buggy.

Installation: `npm i -g mlogx`

Usage: `mlogx`

Features:

* [x] Functions
* [x] Extra instructions like throw, increment, and call
* [x] Stops you from writing silly code like `ubind "poly"`
* [x] `mlogx --info` for information about a command
* [x] Compiler variables
* [x] No more pasting weird unicode characters for the sand icon
* [x] /**/ comments
* [x] Improved syntax for certain commands(ulocate, radar)
* [ ] more functions
* [ ] more extra instructions
* [x] STATIC TYPE CHECKING
* [x] become an npm package

Current issues:
Type checking is a bit wack, some warnings may be fake
