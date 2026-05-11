export function pascalCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}

export function camelCase(str: string): string {
  if (!str) return "";
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function snakeCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function kebabCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/\s+/g, "-") // Replace spaces with hyphen first
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert hyphen before capitals that follow lowercase
    .toLowerCase()
    .replace(/[_]+/g, "-") // Replace underscores with hyphen
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|^-|-$/g, ""); // Remove leading/trailing hyphens
}

export function plural(str: string): string {
  if (!str) return "";
  if (str.endsWith("y")) return str.slice(0, -1) + "ies";
  if (str.endsWith("s") || str.endsWith("x") || str.endsWith("ch")) return str + "es";
  return str + "s";
}

export function singular(str: string): string {
  if (!str) return "";
  if (str.endsWith("ies")) return str.slice(0, -3) + "y";
  if (str.endsWith("es")) return str.slice(0, -2);
  if (str.endsWith("s")) return str.slice(0, -1);
  return str;
}
