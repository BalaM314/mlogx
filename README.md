A transpiler for Mindustry Logic.

Type checks your code before it runs, so you don't waste 5 minutes debugging because you wrote "ubind unittype" instead of "ubind unitType".

Standardizes function calls, variable names, etc. Has functions and an extended instruction set, see [spec.md](spec.md) for more information.

You can use this to manage large projects and split your code into multiple files.

This project is a work in progress, more useful stuff coming soon™

Usage: node compiler/compile.js

You may want to use a path script for that

Features:

* [x] Functions
* [x] Extra instructions like throw, increment, and call
* [x] Stops you from writing silly code like `ubind "poly"`
* [x] `mlogx --info` for information about a command
* [ ] more functions
* [ ] more extra instructions
* [x] STATIC TYPE CHECKING
* [ ] become an npm package