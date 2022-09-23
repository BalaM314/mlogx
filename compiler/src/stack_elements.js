export function hasElement(stack, type) {
    return stack.filter(el => el.type == type).length != 0;
}
export function hasDisabledIf(stack) {
    return stack.filter(el => el.type == "&if" && !el.enabled).length != 0;
}
export function topForLoop(stack) {
    return stack.filter(el => el.type == "&for").at(-1) ?? null;
}
