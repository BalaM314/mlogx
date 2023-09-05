import { isKey } from "../funcs.js";
import { GenericArgs } from "./generic_args.js";
export function arg(str) {
    const matchResult = str.match(/^(\.\.\.)?([\w.]+):(\*)?(\w+)(\?)?$/);
    if (!matchResult) {
        if (str.includes(":")) {
            throw new Error(`Probably bad arg string ${str}`);
        }
        return makeArg(str, str, false, false, false);
    }
    const [, spread, name, isVariable, type, isOptional] = matchResult;
    return makeArg(type, name, !!isOptional, isGenericArg(type), !!isVariable, !!spread);
}
export function argToString(arg) {
    if (!arg.isGeneric)
        return `${arg.type}`;
    if (arg.isOptional)
        return `(${arg.spread ? "..." : ""}${arg.name}:${arg.isVariable ? "*" : ""}${arg.type})`;
    else
        return `[${arg.spread ? "..." : ""}${arg.name}:${arg.isVariable ? "*" : ""}${arg.type}]`;
}
export function makeArg(type, name = "WIP", isOptional = false, isGeneric = true, isVariable = false, spread = false) {
    return {
        type, name, isOptional, isGeneric, isVariable, spread
    };
}
export function isGenericArg(val) {
    return GenericArgs.has(val);
}
export function guessTokenType(token) {
    if (token == "")
        return "invalid";
    if (token == undefined)
        return "invalid";
    for (const [name, argKey] of GenericArgs.entries()) {
        if (argKey.doNotGuess)
            continue;
        if (typeof argKey.validator == "function") {
            if (argKey.validator(token))
                return name;
        }
        else {
            for (const argString of argKey.validator) {
                if (argString instanceof RegExp) {
                    if (argString.test(token))
                        return name;
                }
                else {
                    if (argString == token)
                        return name;
                }
            }
        }
    }
    return "invalid";
}
export function isTokenValidForValidator(token, validator) {
    if (typeof validator == "function") {
        return validator(token);
    }
    else {
        for (const el of validator) {
            if (el instanceof RegExp) {
                if (el.test(token))
                    return true;
            }
            else {
                if (el == token)
                    return true;
            }
        }
        return false;
    }
}
export function isTokenValidForGAT(token, type, checkAlsoAccepts = true) {
    if (token == "")
        return false;
    if (token == undefined)
        return false;
    const argKey = GenericArgs.get(type);
    if (!argKey)
        throw new Error(`Arg ${type} is not a GAT`);
    for (const excludedArg of argKey.exclude) {
        if (!isKey(GenericArgs, excludedArg)) {
            throw new Error(`generic_args.ts data is invalid: generic arg type ${type} specifies exclude option ${excludedArg} which is not a known generic arg type`);
        }
        const excludedArgKey = GenericArgs.get(excludedArg);
        if (isTokenValidForValidator(token, excludedArgKey.validator))
            return false;
    }
    if (checkAlsoAccepts) {
        for (const otherType of argKey.alsoAccepts) {
            if (!isKey(GenericArgs, otherType)) {
                throw new Error(`generic_args.ts data is invalid: generic arg type ${type} specifies alsoAccepts option ${otherType} which is not a known generic arg type`);
            }
            if (isTokenValidForGAT(token, otherType, false))
                return true;
        }
    }
    return isTokenValidForValidator(token, argKey.validator);
}
export function isTokenValidForType(token, arg) {
    if (arg.isVariable)
        return isTokenValidForGAT(token, "variable");
    else if (!arg.isGeneric)
        return token == arg.type;
    else
        return isTokenValidForGAT(token, arg.type);
}
