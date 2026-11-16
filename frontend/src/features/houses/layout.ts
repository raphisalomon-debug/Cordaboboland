// Smart automatic arrangement: visible houses follow the path order in a
// zig-zag, evenly spread over the sheet. Hiding a house closes the gap.
import { House } from "@/src/features/houses/api";

/** Le voilier n'est pas sur le chemin : il flotte sur un lac, en bas à droite de la feuille. */
export const BOAT_KEY = "voyages";

export function autoLayout(houses: House[]): House[] {
  const sorted = [...houses].sort((a, b) => a.order - b.order);
  const land = sorted.filter((h) => h.key !== BOAT_KEY);
  const boat = sorted.filter((h) => h.key === BOAT_KEY);
  const n = land.length;
  const spacing = n > 1 ? Math.min(0.09, 0.62 / (n - 1)) : 0;
  const placed = land.map((h, i) => ({ ...h, x: i % 2 === 0 ? 0.27 : 0.73, y: 0.1 + i * spacing }));
  return [...placed, ...boat.map((h) => ({ ...h, x: 0.77, y: 0.905 }))];
}

/** New path order from where houses sit on the sheet (top to bottom). */
export function orderFromPositions(houses: House[]): House[] {
  return [...houses].sort((a, b) => a.y - b.y || a.x - b.x).map((h, i) => ({ ...h, order: i + 1 }));
}
