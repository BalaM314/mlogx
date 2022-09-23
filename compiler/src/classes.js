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
