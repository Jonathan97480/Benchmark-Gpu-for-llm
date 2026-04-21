export function formatPrice(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value) {
  return Number.isFinite(value) && value > 0 ? value.toLocaleString("fr-FR") : "—";
}
