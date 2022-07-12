A transpiler for Mindustry Logic.

(404 logo not found)

Design goals:
1. Validation
  - Debugging MLOG code is currently very painful. The only way to notice that you typed `ucontrol itemtake` instead of `ucontrol itemTake` is to look through all your control flow to see why units aren't taking items, and finally see the purple "invalid" box. There is also no warning for using a variable that doesn't exist. The MLOGX compiler will check your code before it compiles to make sure all commands are valid and all variables are of the correct type.
2. Readability and Conciseness
  - Text MLOG statements can be a bit weird. For example, the `ulocate building` instruction requires a meaningless ore as an argument, and several other instructions have repeated or strangely ordered arguments and/or meaningless zeros. MLOGX has more concise statements with better ordering of arguments, while still accepting the old ones.
  - The preferred variable naming convention is to use a thing.property syntax, for example, `sensor core.x`. This is a shorthand for `sensor core.x core @x` as you would otherwise be typing things twice. This makes it very clear what each variable is meant to be.
  - Sometimes there are bits of data that you might want to change, but never while your code is running. Storing these as a variable in your MLOG code is a waste of instructions, so they often end up getting inlined, making them difficult to change. MLOGX has compiler consts, which allow you to inline data without compromising readability.
  - Advanced unit control logic often requires highly repetitive code, for example, the same block of code repeated an arbitrary number of times but with one number incrementing. `&for` loops clean this up easily, and allow you to change the target number of units by changing a single compiler const in a config.json file instead of copy pasting your code n times, failing to change a number in one place, and then wasting 15 minutes debugging. (&for loops currently only support incrementing numbers, &for of coming soon)
  - MLOGX also allows you to split your code into multiple files, which is useful if you use a particular bit of code lots of times.
3. Optimization
  - Because MLOGX is a strict superset of MLOG, your code can be optimized just as much as if you were writing regular MLOG. The compiler does not inject extra executed instructions unless you ask for it.
  - MLOGX is not currently an optimizing compiler, the instructions you put in are what you will get out.


Installation: `npm i -g mlogx`

Usage: `mlogx`

Features:

* [x] Stops you from writing silly code like `ubind "poly"`
* [x] Improved syntax for certain commands(ulocate, radar)
* [x] `mlogx info` for information about a command
* [x] Compiler constants
* [x] No more pasting weird unicode characters for the sand icon
* [x] /**/ comments
* [x] Static type checking
* [x] NPM package
* [x] `--watch` option
* [x] Namespaces
* [x] Loop unrolling syntax
* [x] Functions
* [ ] More functions
* [ ] More extra instructions
* [ ] Inline functions
* [ ] Console output highlighting