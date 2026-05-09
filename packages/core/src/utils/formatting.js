export function formatDate(date, format = "YYYY-MM-DD") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return format.replace("YYYY", String(year)).replace("MM", month).replace("DD", day);
}
export function formatNumber(value, decimals = 2) {
  return value.toFixed(decimals);
}
export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}
//# sourceMappingURL=formatting.js.map
