// Pays visités (partagés entre nous deux) : hooks, miroir de backend/features/voyages.py.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Visited = { code: string; color: string };
const KEY = ["voyages"];

/** Couleurs proposées pour un pays visité (la première est celle par défaut). */
export const VISIT_COLORS = ["#E8826B", "#E9C46A", "#8FB07A", "#7FB3D5", "#B79CD6", "#EDA1BD", "#F2B07A", "#81B29A"];

export const useVisited = () => useQuery({ queryKey: KEY, queryFn: () => api<Visited[]>("/voyages") });

export function useVisitedActions() {
  const qc = useQueryClient();
  const onSuccess = (list: Visited[]) => qc.setQueryData(KEY, list);
  const set = useMutation({
    mutationFn: (v: Visited) => api<Visited[]>(`/voyages/${v.code}`, { method: "PUT", body: { color: v.color } }),
    onSuccess,
  });
  const unset = useMutation({
    mutationFn: (code: string) => api<Visited[]>(`/voyages/${code}`, { method: "DELETE" }),
    onSuccess,
  });
  return { set, unset };
}
