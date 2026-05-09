export function pascalCase(str) {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}
export function camelCase(str) {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
export function snakeCase(str) {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}
export function kebabCase(str) {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}
export function plural(str) {
  if (str.endsWith("y")) return str.slice(0, -1) + "ies";
  if (str.endsWith("s") || str.endsWith("x") || str.endsWith("ch")) return str + "es";
  return str + "s";
}
export function singular(str) {
  if (str.endsWith("ies")) return str.slice(0, -3) + "y";
  if (str.endsWith("es")) return str.slice(0, -2);
  if (str.endsWith("s")) return str.slice(0, -1);
  return str;
}
//# sourceMappingURL=naming.js.map
