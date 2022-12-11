A transpiler for Mindustry Logic.

![logo](logo.png)

Installation: `npm i -g mlogx`

Usage: `mlogx`

# Design goals
1. Validation
  - Debugging MLOG code is painful. The only way to notice that you typed `ucontrol itemtake` instead of `ucontrol itemTake` is to scroll through your entire program to see why units aren't taking items, and finally see the purple "invalid" box. There is also no warning for using a variable that doesn't exist. The MLOGX compiler will check your code before it compiles to make sure all commands are valid and all variables are of the correct type.
2. Readability and Conciseness
  - Text MLOG statements can be a bit weird. For example, the `ulocate building` instruction requires a meaningless ore as an argument, and several other instructions have repeated or strangely ordered arguments and/or meaningless zeros. MLOGX has more concise statements with better ordering of arguments, while still accepting the old ones.
  - It also supports shorthand instructions, such as infix op(`set x 5 + 5` => `op add x 5 5`) and infix jump(`jump label x >= 5` => `jump label greaterThanEq x 5`)
  - The preferred variable naming convention is to use a thing.property syntax, for example, `sensor core.x`. This is a shorthand for `sensor core.x core @x` as you would otherwise be typing things twice. This makes it very clear what each variable is meant to be.
  - Sometimes there are bits of data that you might want to change, but never while your code is running. Storing these as a variable in your MLOG code is a waste of instructions, so they often end up getting inlined, making them difficult to change and understand. MLOGX has compiler consts, which allow you to inline data without compromising readability.
  - Advanced unit control logic often requires highly repetitive code, for example, the same block of code repeated an arbitrary number of times but with one number incrementing. [`&for` loops clean this up easily](https://github.com/BalaM314/mlog/blob/main/single_files/payEnter/multiPayenter.mlogx), and allow you to change the target number of units by changing a single compiler const in a config.json file instead of copy pasting your code n times, forgetting to change a number in one place, and then wasting 15 minutes wondering why the 3rd flare doesn't get rebound.
  - Logic that prints information is both difficult to read and hard to change. The printf statement allows you to write `printf "Power: {powerIn}/{powerOut} ({powerPerc}%)"`.
  - MLOGX also allows you to split your code into multiple files, which is useful if you use a particular bit of code lots of times.
3. Optimization
  - Because MLOGX is a strict superset of MLOG, your code can be optimized just as much as if you were writing regular MLOG. The compiler does not inject extra executed instructions unless you ask for it.
  - MLOGX is not currently an optimizing compiler, the instructions you put in are what you will get out.


# Example images
![Image of error messages](https://user-images.githubusercontent.com/71201189/178729128-d7acd742-24e8-4e10-bae8-f97a41fcfd9e.png)

![Image of concise statements](https://user-images.githubusercontent.com/71201189/178733137-9cdcc42f-3b0a-4d9c-abb3-cd65118ef4c9.png)

![Image of compiler consts](https://user-images.githubusercontent.com/71201189/178735730-9bb5783c-6ea7-4e20-8012-7be6af6d9399.png)

![Image of &for loops](https://user-images.githubusercontent.com/71201189/178742854-59b85a72-29e2-4651-90ab-93bf0726e49c.png)

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
* [?] Namespaces
* [x] Loop unrolling syntax
* [x] Functions
* [x] Console output highlighting
* [x] Porting tool
* [x] Infix op and jump syntax
* [ ] More functions
* [ ] Inline functions
* [ ] Custom commands
