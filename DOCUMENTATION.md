# Documentation

## ShortHands
### Sensor
**Vanila Notation**
`sensor (output) (object) @(property)`

 create a variable named (output) and define as the (property) from an (object).

**Dot Notation**
`sensor (object.property)`

create a variable named (object.property) and define as the (property) from an (object).

Example:

```
getlink building 0
sensor building.health
print building.health
```

### Operation: Single Argument Operands Only
**Vanila Notation**
`op (operand) (argument1) (argument1)`

Do (operand) on (argument1) mutating it.

**ShortHand**
`op (operand) (argument1)`

Do (operand) on (argument1) mutating it.

Example:

```
set x -79
sensor abs x // x holds 79 now
```

### Functions

## Compiler 

### config.json

### Compiler Variables

### Compiler Functions
