import { splitLineIntoArguments } from "./funcs.js";
import { messages } from "./Log.js";
export class CompilerError extends Error {
    constructor(message) {
        super(message);
        this.name = "CompilerError";
    }
    static throw(messageID, data) {
        const message = messages[messageID];
        throw new this(message.for(data));
    }
}
export class Statement {
    constructor(text, sourceFilename, sourceLineNumber, sourceText, cleanedSourceText) {
        this.text = text;
        this.sourceFilename = sourceFilename;
        this.sourceLineNumber = sourceLineNumber;
        this.sourceText = sourceText;
        this.cleanedSourceText = cleanedSourceText;
        this.args = splitLineIntoArguments(text);
    }
    static fromLines(text, source, cleanedSource) {
        return new Statement(text, source.sourceFilename, source.lineNumber, source.text, cleanedSource.text);
    }
    sourceLine() {
        return {
            lineNumber: this.sourceLineNumber,
            sourceFilename: this.sourceFilename,
            text: this.sourceText
        };
    }
    cleanedSourceLine() {
        return {
            lineNumber: this.sourceLineNumber,
            sourceFilename: this.sourceFilename,
            text: this.cleanedSourceText
        };
    }
}
