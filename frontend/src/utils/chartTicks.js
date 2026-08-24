export function selectChartTickIndexes(pointCount) {
  const tickCount = Math.min(pointCount, 7);
  if (!tickCount) return new Set();
  if (tickCount === 1) return new Set([0]);
  return new Set(Array.from(
    { length: tickCount },
    (_, index) => Math.round(index * (pointCount - 1) / (tickCount - 1)),
  ));
}
