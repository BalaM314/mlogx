const fs = require("fs");
const programArgs = process.argv.slice(2);
if (process.cwd().match(/compiler$/gi)) {
    process.chdir("..");
}
var ArgType;
(function (ArgType) {
    ArgType["variable"] = "variable";
    ArgType["number"] = "number";
    ArgType["string"] = "string";
    ArgType["type"] = "type";
    ArgType["building"] = "building";
    ArgType["unit"] = "unit";
    ArgType["function"] = "function";
    ArgType["any"] = "any";
    ArgType["null"] = "null";
})(ArgType || (ArgType = {}));
class Arg {
    constructor(type, optional = false) {
        this.type = type;
        this.optional = optional;
    }
    toString() {
        if (this.optional) {
            return `(${this.type})`;
        }
        else {
            return `[${this.type}]`;
        }
    }
}
let commands = {
    call: {
        args: [new Arg(ArgType.function)],
        replace: [
            "set _stack1 @counter",
            "op add _stack1 _stack1 2",
            "jump %1 always"
        ]
    },
    increment: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.number)],
        replace: ["op add %1 %1 %2"]
    },
    return: {
        args: [],
        replace: ["set @counter _stack1"]
    },
    throw: {
        args: [new Arg(ArgType.string)],
        replace: [
            "set _err %1",
            "jump _err always"
        ]
    },
    read: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)]
    },
    write: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.number)]
    },
    draw: {
        args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.number)]
    },
    print: {
        args: [new Arg(ArgType.string)]
    },
    drawflush: {
        args: [new Arg(ArgType.building)]
    },
    printflush: {
        args: [new Arg(ArgType.building)]
    },
    getlink: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.number)]
    },
    control: {
        args: [new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any)]
    },
    radar: {
        args: [new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.building), new Arg(ArgType.number), new Arg(ArgType.variable)]
    },
    sensor: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.building), new Arg(ArgType.type)]
    },
    set: {
        args: [new Arg(ArgType.variable), new Arg(ArgType.any)]
    },
    op: {
        args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number), new Arg(ArgType.number)]
    },
    wait: {
        args: [new Arg(ArgType.number)]
    },
    lookup: {
        args: [new Arg(ArgType.any), new Arg(ArgType.variable), new Arg(ArgType.number)]
    },
    end: {
        args: []
    },
    jump: {
        args: [new Arg(ArgType.number), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any)]
    },
    ubind: {
        args: [new Arg(ArgType.type)]
    },
    ucontrol: {
        args: [new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.number), new Arg(ArgType.any)]
    },
    uradar: {
        args: [new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.number), new Arg(ArgType.variable)]
    },
    ulocate: {
        args: [new Arg(ArgType.any), new Arg(ArgType.any), new Arg(ArgType.number), new Arg(ArgType.type), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable), new Arg(ArgType.variable)]
    },
};
function typeofArg(arg) {
    if (arg == "")
        return ArgType.null;
    if (arg.match(/@[a-z\-]+/i)) {
        if (arg == "@counter")
            return ArgType.variable;
        if (arg == "@unit")
            return ArgType.unit;
        if (arg == "@thisx")
            return ArgType.number;
        if (arg == "@thisy")
            return ArgType.number;
        if (arg == "@this")
            return ArgType.building;
        if (arg == "@ipt")
            return ArgType.number;
        if (arg == "@links")
            return ArgType.number;
        if (arg == "@time")
            return ArgType.number;
        if (arg == "@ipt")
            return ArgType.number;
        if (arg == "@tick")
            return ArgType.number;
        if (arg == "@mapw")
            return ArgType.number;
        if (arg == "@maph")
            return ArgType.number;
        return ArgType.type;
    }
    if (arg == "true")
        return ArgType.number;
    if (arg.match(/^-?[\d]+$/))
        return ArgType.number;
    if (arg.match(/^"[^"]*"$/gi))
        return ArgType.string;
    if (arg.match(/^[a-z]+[\d]+$/gi))
        return ArgType.building;
    if (arg.match(/^[^"]+$/i))
        return ArgType.variable;
    return ArgType.null;
}
function isArgOfType(arg, type) {
    if (type == ArgType.any)
        return true;
    if (arg == "0")
        return true;
    if (arg == "")
        return false;
    let knownType = typeofArg(arg);
    switch (type) {
        case ArgType.variable: return knownType == type;
        case ArgType.type:
        case ArgType.number:
        case ArgType.string:
        case ArgType.building:
        case ArgType.unit:
        case ArgType.function:
            return knownType == type || knownType == ArgType.variable;
    }
}
class CompilerError extends Error {
    constructor(message) {
        super(...arguments);
        this.name = "CompilerError";
    }
}
function compileMlogxToMlog(data) {
    let outputData = [];
    for (var line of data) {
        if (line.includes("#") || line.includes("//")) {
            if (!false) {
                line = line.split("#")[0];
                line = line.split("//")[0];
            }
        }
        if (line == "")
            continue;
        if (line.match(/:$/)) {
            outputData.push(line);
            continue;
        }
        let args = line.split(" ");
        if (line.includes(`"`)) {
            let replacementLine = [];
            let isInString = false;
            for (var char of line) {
                if (char == `"`) {
                    isInString = !isInString;
                }
                if (isInString && char == " ") {
                    replacementLine.push("\uFFFD");
                }
                else {
                    replacementLine.push(char);
                }
            }
            args = replacementLine.join("").split(" ").map(arg => arg.replaceAll("\uFFFD", " "));
        }
        let command = commands[args[0].toLowerCase()];
        if (!command) {
            throw new CompilerError(`Unknown command ${args[0]}\nat ${line}`);
        }
        if (args.length - 1 != command.args.length) {
            throw new CompilerError(`Incorrect number of arguments for command ${args[0]}
at ${line}
Correct usage: ${args[0]} ${command.args.map(arg => arg.toString()).join(" ")}`);
        }
        for (let arg in command.args) {
            if (!isArgOfType(args[+arg + 1], command.args[+arg].type)) {
                throw new CompilerError(`Type mismatch: value ${args[+arg + 1]} was expected to be of type ${command.args[+arg].type}, but was of type ${typeofArg(args[+arg + 1])}
\tat \`${line}\``);
            }
        }
        if (command.replace) {
            for (var replaceLine of command.replace) {
                replaceLine = replaceLine.replace(/%1/, args[1]);
                replaceLine = replaceLine.replace(/%2/, args[2]);
                replaceLine = replaceLine.replace(/%3/, args[3]);
                outputData.push(replaceLine);
            }
        }
        outputData.push(line);
    }
    return outputData;
}
function main() {
    if (programArgs[0]) {
        console.log("Compiling in directory " + programArgs[0]);
        process.chdir(programArgs[0]);
    }
    if (!fs.existsSync(process.cwd() + "/src")) {
        console.error("No src directory found!");
        return;
    }
    if (!fs.existsSync(process.cwd() + "/build")) {
        fs.mkdirSync(process.cwd() + "/build");
    }
    let filelist_mlogx = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
    let filelist_mlog = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlog$/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let mainData = "";
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
        let outputData;
        try {
            outputData = compileMlogxToMlog(data).join("\r\n");
        }
        catch (err) {
            console.error(`Failed to compile file ${filename}!`);
            console.error(err.message);
            return;
        }
        fs.writeFileSync(`build/${filename.slice(0, -1)}`, outputData);
        if (data[0] == "#include never")
            continue;
        if (filename != "main.mlogx") {
            compiledData[filename] = outputData;
        }
        else {
            mainData = outputData;
        }
    }
    for (let filename of filelist_mlog) {
        if (filename != "main.mlog") {
            compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8');
        }
        else {
            mainData = fs.readFileSync(`src/${filename}`, 'utf-8');
        }
    }
    console.log("Compiled all files successfully.");
    console.log("Assembling output:");
    fs.writeFileSync(`out.mlog`, mainData + "\r\nend\r\n\r\n" + Object.values(compiledData).join("\r\n\r\n"));
    console.log("Done!");
}
main();
