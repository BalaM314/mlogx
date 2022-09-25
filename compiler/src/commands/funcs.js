import { arg } from "../args/funcs.js";
export function processCommands(preprocessedCommands) {
    const out = {};
    for (const [name, commands] of Object.entries(preprocessedCommands)) {
        out[name] = [];
        for (const command of commands) {
            const processedCommand = {
                type: "Command",
                description: command.description,
                name: name,
                args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg)) : [],
                getVariablesDefined: command.getVariablesDefined,
                getVariablesUsed: command.getVariablesUsed,
                port: command.port
            };
            if (command.replace instanceof Array) {
                processedCommand.replace = function (args) {
                    return command.replace.map(replaceLine => {
                        for (let i = 1; i < args.length; i++) {
                            replaceLine = replaceLine.replace(new RegExp(`%${i}`, "g"), args[i]);
                        }
                        return replaceLine;
                    });
                };
            }
            else if (typeof command.replace == "function") {
                processedCommand.replace = command.replace;
            }
            out[name].push(processedCommand);
        }
    }
    return out;
}
export function processCompilerCommands(preprocessedCommands) {
    const out = {};
    for (const [id, group] of Object.entries(preprocessedCommands)) {
        out[id] = {
            stackElement: group.stackElement,
            overloads: []
        };
        for (const command of group.overloads) {
            const commandDefinition = {
                type: "CompilerCommand",
                description: command.description,
                name: id,
                args: command.args ? command.args.split(" ").map(commandArg => arg(commandArg)) : [],
                onbegin: command.onbegin,
                onprecompile: command.onprecompile,
                onpostcompile: command.onpostcompile,
                onend: command.onend,
            };
            if (commandDefinition.onbegin) {
                const oldFunction = commandDefinition.onbegin;
                commandDefinition.onbegin = (args, line, stack) => {
                    const outputData = oldFunction(args, line, stack);
                    return {
                        ...outputData,
                        element: {
                            ...outputData.element,
                            commandDefinition
                        }
                    };
                };
            }
            out[id].overloads.push(commandDefinition);
        }
    }
    return out;
}
