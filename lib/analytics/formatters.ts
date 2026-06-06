export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, precision = 2) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function formatPercentage(value: number, precision = 2) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)} %`;
}
