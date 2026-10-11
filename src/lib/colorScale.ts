/**
 * Color helpers for conditional probability and earthquake magnitude.
 * Extracted into a zero-dependency module so above-the-fold summary components
 * do not pull Leaflet into the critical initial bundle.
 */
export function getProbabilityColor(prob: number): string {
  if (prob >= 0.45) return '#ef4444'; // Red-500 (Critical >= 45%)
  if (prob >= 0.25) return '#f97316'; // Orange-500 (High 25-45%)
  if (prob >= 0.1) return '#eab308'; // Yellow-500 (Moderate 10-25%)
  return '#22c55e'; // Green-500 (Low < 10%)
}

export function getMagnitudeColor(mag: number): string {
  if (mag >= 5.0) return '#dc2626';
  if (mag >= 4.0) return '#f97316';
  if (mag >= 3.0) return '#facc15';
  return '#38bdf8';
}
