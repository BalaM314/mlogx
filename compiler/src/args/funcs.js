import { impossible, isKey } from "../funcs.js";
import { GenericArgs } from "./generic_args.js";
import { Log } from "../Log.js";
export function arg(str) {
    const matchResult = str.match(/(\.\.\.)?(\w+):(\*)?(\w+)(\?)?/);
    if (!matchResult) {
        if (str.includes(":")) {
            Log.warn(`Possibly bad arg string ${str}, assuming it means a non-generic arg`);
        }
        return makeArg(str, str, false, false, false);
    }
    const [, spread, name, isVariable, type, isOptional] = matchResult;
    return makeArg(type, name, !!isOptional, isGenericArg(type), !!isVariable, !!spread);
}
export function makeArg(type, name = "WIP", isOptional = false, isGeneric = true, isVariable = false, spread = false) {
    return {
        type, name, isOptional, isGeneric, isVariable, spread
    };
}
export function isGenericArg(val) {
    return GenericArgs.has(val);
}
export function typeofArg(arg) {
    if (arg == "")
        return "invalid";
    if (arg == undefined)
        return "invalid";
    for (const [name, argKey] of GenericArgs.entries()) {
        if (argKey.doNotGuess)
            continue;
        if (typeof argKey.validator == "function") {
            if (argKey.validator(arg))
                return name;
        }
        else {
            for (const argString of argKey.validator) {
                if (argString instanceof RegExp) {
                    if (argString.test(arg))
                        return name;
                }
                else {
                    if (argString == arg)
                        return name;
                }
            }
        }
    }
    return "invalid";
}
export function isArgValidForValidator(argToCheck, validator) {
    if (typeof validator == "function") {
        return validator(argToCheck);
    }
    else {
        for (const argString of validator) {
            if (argString instanceof RegExp) {
                if (argString.test(argToCheck))
                    return true;
            }
            else {
                if (argString == argToCheck)
                    return true;
            }
        }
        return false;
    }
}
export function isArgValidForType(argToCheck, arg, checkAlsoAccepts = true) {
    if (argToCheck == "")
        return false;
    if (argToCheck == undefined)
        return false;
    if (!isGenericArg(arg)) {
        return argToCheck === arg;
    }
    const argKey = GenericArgs.get(arg);
    if (!argKey)
        impossible();
    for (const excludedArg of argKey.exclude) {
        if (!isKey(GenericArgs, excludedArg)) {
            throw new Error(`Arg AST is invalid: generic arg type ${arg} specifies exclude option ${excludedArg} which is not a known generic arg type`);
        }
        const excludedArgKey = GenericArgs.get(excludedArg);
        if (isArgValidForValidator(argToCheck, excludedArgKey.validator))
            return false;
    }
    if (checkAlsoAccepts) {
        for (const otherType of argKey.alsoAccepts) {
            if (isArgValidForType(argToCheck, otherType, false))
                return true;
        }
    }
    return isArgValidForValidator(argToCheck, argKey.validator);
}
export function isArgValidFor(str, arg) {
    if (arg.isVariable) {
        return isArgValidForType(str, "variable");
    }
    return isArgValidForType(str, arg.type);
}
