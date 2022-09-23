export class CompilerError extends Error {
    constructor(message) {
        super(message);
        this.name = "CompilerError";
    }
}
