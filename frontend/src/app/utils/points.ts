/** Russian plural form for points: 1 балл, 2 балла, 5 баллов. */
export function pointsLabel(value: number): string {
  const n = Math.abs(Math.trunc(value));
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "баллов";
  if (last === 1) return "балл";
  if (last >= 2 && last <= 4) return "балла";
  return "баллов";
}
