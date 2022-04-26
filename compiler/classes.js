export class Arg {
    constructor(type, name = "WIP", isOptional = false, isGeneric = true, isVariable = false) {
        this.type = type;
        this.name = name;
        this.isOptional = isOptional;
        this.isGeneric = isGeneric;
        this.isVariable = isVariable;
    }
    toString() {
        if (!this.isGeneric)
            return `${this.type}`;
        if (this.isOptional)
            return `(${this.name}:${this.isVariable ? "*" : ""}${this.type})`;
        else
            return `[${this.name}:${this.isVariable ? "*" : ""}${this.type}]`;
    }
}
export class CompilerError extends Error {
    constructor(message) {
        super(...arguments);
        this.name = "CompilerError";
    }
}
