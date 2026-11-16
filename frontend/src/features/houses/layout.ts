// Smart automatic arrangement: visible houses follow the path order in a
// zig-zag, evenly spread over the sheet. Hiding a house closes the gap.
import { House } from "@/src/features/houses/api";

export function autoLayout(houses: House[]): House[] {
  const sorted = [...houses].sort((a, b) => a.order - b.order);
  const n = sorted.length;
  const spacing = n > 1 ? Math.min(0.78 / (n - 1), 0.2) : 0;
  const start = 0.5 - (spacing * (n - 1)) / 2;
  return sorted.map((h, i) => ({ ...h, x: i % 2 === 0 ? 0.27 : 0.73, y: start + i * spacing }));
}

/** New path order from where houses sit on the sheet (top to bottom). */
export function orderFromPositions(houses: House[]): House[] {
  return [...houses].sort((a, b) => a.y - b.y || a.x - b.x).map((h, i) => ({ ...h, order: i + 1 }));
}
