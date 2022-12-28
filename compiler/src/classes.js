import { getCommandDefinitions, splitLineIntoTokens } from "./funcs.js";
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
    constructor(text, sourceText, cleanedSourceText, modifiedSourceText, sourceFilename, sourceLineNumber) {
        this.text = text;
        this.sourceText = sourceText;
        this.sourceFilename = sourceFilename;
        this.sourceLineNumber = sourceLineNumber;
        this.cleanedSource = {
            text: cleanedSourceText,
            tokens: splitLineIntoTokens(cleanedSourceText),
            commandDefinitions: getCommandDefinitions(cleanedSourceText)
        };
        this.modifiedSource = {
            text: modifiedSourceText,
            tokens: splitLineIntoTokens(modifiedSourceText),
            commandDefinitions: getCommandDefinitions(modifiedSourceText)
        };
        this.compiled = {
            text,
            tokens: splitLineIntoTokens(text),
            commandDefinitions: getCommandDefinitions(text)
        };
        this.tokens = this.compiled.tokens;
        this.commandDefinitions = this.compiled.commandDefinitions;
    }
    static fromLines(text, source, cleanedSource) {
        return new Statement(text, source.text, cleanedSource.text, cleanedSource.text, source.sourceFilename, source.lineNumber);
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
            text: this.cleanedSource.text,
        };
    }
    modifiedSourceLine() {
        return {
            lineNumber: this.sourceLineNumber,
            sourceFilename: this.sourceFilename,
            text: this.modifiedSource.text,
        };
    }
}
