export var PortingMode;
(function (PortingMode) {
    PortingMode[PortingMode["removeZeroes"] = 0] = "removeZeroes";
    PortingMode[PortingMode["shortenSyntax"] = 1] = "shortenSyntax";
    PortingMode[PortingMode["modernSyntax"] = 2] = "modernSyntax";
})(PortingMode || (PortingMode = {}));
export var CommandErrorType;
(function (CommandErrorType) {
    CommandErrorType["argumentCount"] = "argumentCount";
    CommandErrorType["type"] = "type";
    CommandErrorType["noCommand"] = "noCommand";
    CommandErrorType["badStructure"] = "badStructure";
})(CommandErrorType || (CommandErrorType = {}));
