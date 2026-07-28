/** Small, dependency-free string/naming helpers shared across the CLI. */

export function toSnakeCase(str: string): string {
  if (/^[A-Z0-9_]+$/.test(str)) return str.toLowerCase();
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])/g, (m, _c, offset) => (offset === 0 ? m : m))
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .replace(/^_/, "");
}

export function pascalCase(str: string): string {
  return str
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function camelCase(str: string): string {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function kebabCase(str: string): string {
  return toSnakeCase(str).replace(/_/g, "-");
}

/** Naive English pluralization sufficient for route/collection names. */
export function plural(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.replace(/y$/i, "ies");
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

export function foreignKeyName(targetEntity: string): string {
  const snake = toSnakeCase(targetEntity).replace(/^bus_/, "");
  return `${snake}_id`;
}

export function stripQuotes(str: string): string {
  return str.replace(/^["']|["']$/g, "").trim();
}
