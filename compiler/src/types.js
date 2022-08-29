export var GAT;
(function (GAT) {
    GAT["variable"] = "variable";
    GAT["number"] = "number";
    GAT["string"] = "string";
    GAT["boolean"] = "boolean";
    GAT["type"] = "type";
    GAT["building"] = "building";
    GAT["unit"] = "unit";
    GAT["function"] = "function";
    GAT["any"] = "any";
    GAT["null"] = "null";
    GAT["operandTest"] = "operandTest";
    GAT["targetClass"] = "targetClass";
    GAT["unitSortCriteria"] = "unitSortCriteria";
    GAT["valid"] = "valid";
    GAT["operandDouble"] = "operandDouble";
    GAT["operandSingle"] = "operandSingle";
    GAT["lookupType"] = "lookupType";
    GAT["jumpAddress"] = "jumpAddress";
    GAT["buildingGroup"] = "buildingGroup";
    GAT["invalid"] = "invalid";
    GAT["ctype"] = "ctype";
    GAT["sOperandDouble"] = "sOperandDouble";
})(GAT || (GAT = {}));
export const GenericArgType = GAT;
export var PortingMode;
(function (PortingMode) {
    PortingMode[PortingMode["removeZeroes"] = 0] = "removeZeroes";
    PortingMode[PortingMode["updateSyntax"] = 1] = "updateSyntax";
    PortingMode[PortingMode["modernSyntax"] = 2] = "modernSyntax";
})(PortingMode || (PortingMode = {}));
export var CommandErrorType;
(function (CommandErrorType) {
    CommandErrorType[CommandErrorType["argumentCount"] = 0] = "argumentCount";
    CommandErrorType[CommandErrorType["type"] = 1] = "type";
    CommandErrorType[CommandErrorType["noCommand"] = 2] = "noCommand";
    CommandErrorType[CommandErrorType["badStructure"] = 3] = "badStructure";
})(CommandErrorType || (CommandErrorType = {}));
