// Fleuriste : types, palettes et hooks (miroir de backend/features/fleuriste.py).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api";

export type ShapeKey = "ronde" | "ovale" | "pointue" | "coeur" | "goutte";
/** Points en coordonnées de pétale : u = position sur la largeur (-0.5..0.5), v = hauteur (0 = base, 1 = pointe). */
export type Stroke = { color: string; width: number; points: [number, number][] };
export type Flower = { shape: ShapeKey; petals: number; petal_color: string; center_color: string; drawing: Stroke[] };
export type Bouquet = { id: string; author_id: string; author_name: string; created_at: string; note: string; flowers: Flower[] };

export const SHAPES: { key: ShapeKey; label: string }[] = [
  { key: "ronde", label: "Ronde" },
  { key: "ovale", label: "Ovale" },
  { key: "pointue", label: "Pointue" },
  { key: "coeur", label: "Cœur" },
  { key: "goutte", label: "Goutte" },
];
export const PETAL_COLORS = ["#F6A6B8", "#F4C2D7", "#E26D6D", "#F2B07A", "#F5D76E", "#FFFFFF", "#C9B6E8", "#9DB8F0", "#7FB3D5", "#A8D5A2", "#E8826B", "#8A5E9E"];
export const CENTER_COLORS = ["#E9C46A", "#B5835A", "#E26D6D", "#FFFFFF", "#7F9468", "#5A4A3C", "#F4A261", "#C9B6E8"];
export const PEN_COLORS = ["#3E3A35", "#FFFFFF", "#E26D6D", "#E9C46A", "#7FB3D5", "#8FB07A", "#B79CD6", "#F6A6B8"];
export const MAX_FLOWERS = 8;

export const newFlower = (i = 0): Flower => ({
  shape: "ronde",
  petals: 6,
  petal_color: PETAL_COLORS[(i * 3) % PETAL_COLORS.length],
  center_color: CENTER_COLORS[0],
  drawing: [],
});

const KEY = ["bouquets"];
export const useBouquets = () => useQuery({ queryKey: KEY, queryFn: () => api<Bouquet[]>("/fleuriste") });

export function useBouquetActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const create = useMutation({
    mutationFn: (b: { flowers: Flower[]; note: string }) => api<Bouquet>("/fleuriste", { method: "POST", body: b }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/fleuriste/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  return { create, remove };
}
