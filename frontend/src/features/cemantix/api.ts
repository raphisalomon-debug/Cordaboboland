// Course Cémantix : types + hooks (miroir de backend/features/cemantix.py).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Claim = { user_id: string; name: string; role: "admin" | "partner"; found_at: string; rank: number };
export type Score = { user_id: string; name: string; role: "admin" | "partner"; wins: number };
export type CemantixState = {
  date: string;
  link: string;
  claims: Claim[];
  winner: Claim | null;
  me_found: boolean;
  scores: Score[];
};

const KEY = ["cemantix-today"];

// Rafraîchi toutes les 15 s : on voit arriver l'autre en direct.
export const useCemantix = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<CemantixState>("/cemantix/today"), refetchInterval: 15000 });

export function useCemantixActions() {
  const qc = useQueryClient();
  const onSuccess = (state: CemantixState) => qc.setQueryData(KEY, state);
  const found = useMutation({ mutationFn: () => api<CemantixState>("/cemantix/found", { method: "POST" }), onSuccess });
  const undo = useMutation({ mutationFn: () => api<CemantixState>("/cemantix/found", { method: "DELETE" }), onSuccess });
  return { found, undo };
}

/** Roi pour l'admin (Raphi), reine pour le compte partenaire. */
export const crownTitle = (role: "admin" | "partner") => (role === "admin" ? "Roi du jour" : "Reine du jour");
