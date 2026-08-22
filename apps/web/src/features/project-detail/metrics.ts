export function metricRingPercent(value: string): number {
  const numericValue = value.match(/(\d+)/)?.[1];
  return Math.min(numericValue ? Number.parseInt(numericValue, 10) : 50, 100);
}
