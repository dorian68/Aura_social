export function calculateARR(audience: number, engagementRate: number, annualArpu: number) {
  const vipConversionRate = 0.1;
  return audience * (engagementRate / 100) * vipConversionRate * annualArpu;
}

export function formatCurrency(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  }).format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}
