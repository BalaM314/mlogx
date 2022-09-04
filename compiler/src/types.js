export var PortingMode;
(function (PortingMode) {
    PortingMode[PortingMode["removeZeroes"] = 0] = "removeZeroes";
    PortingMode[PortingMode["shortenSyntax"] = 1] = "shortenSyntax";
    PortingMode[PortingMode["modernSyntax"] = 2] = "modernSyntax";
})(PortingMode || (PortingMode = {}));
export var CommandErrorType;
(function (CommandErrorType) {
    CommandErrorType[CommandErrorType["argumentCount"] = 0] = "argumentCount";
    CommandErrorType[CommandErrorType["type"] = 1] = "type";
    CommandErrorType[CommandErrorType["noCommand"] = 2] = "noCommand";
    CommandErrorType[CommandErrorType["badStructure"] = 3] = "badStructure";
})(CommandErrorType || (CommandErrorType = {}));
