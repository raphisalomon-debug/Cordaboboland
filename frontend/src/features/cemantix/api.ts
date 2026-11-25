// Course Cémantix : types + hooks (miroir de backend/features/cemantix.py).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Claim = { user_id: string; name: string; role: "admin" | "partner"; found_at: string; rank: number; tries: number | null };
export type Score = { user_id: string; name: string; role: "admin" | "partner"; wins: number };
export type CemantixState = {
  date: string;
  number: number;
  link: string;
  claims: Claim[];
  winner: Claim | null;
  complete: boolean;
  tie: boolean;
  me_status: "pending" | "verified" | "rejected" | null;
  pending: { user_id: string; name: string }[];
  solution_ready: boolean;
  scores: Score[];
};

const KEY = ["cemantix-today"];

// Rafraîchi toutes les 15 s : on voit arriver l'autre en direct.
export const useCemantix = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<CemantixState>("/cemantix/today"), refetchInterval: 15000 });

export function useCemantixActions() {
  const qc = useQueryClient();
  const onSuccess = (state: CemantixState) => qc.setQueryData(KEY, state);
  const found = useMutation({
    mutationFn: (v: { word: string; tries: number }) => api<CemantixState>("/cemantix/found", { method: "POST", body: v }),
    onSuccess,
  });
  const undo = useMutation({ mutationFn: () => api<CemantixState>("/cemantix/found", { method: "DELETE" }), onSuccess });
  return { found, undo };
}

/** Roi pour l'admin (Raphi), reine pour le compte partenaire. */
export const crownTitle = (role: "admin" | "partner") => (role === "admin" ? "Roi du jour" : "Reine du jour");

export type HistoryDay = {
  date: string;
  number: number;
  complete: boolean;
  winner_id: string;
  tie: boolean;
  tries: Record<string, number | null>;
};
export type HistoryStat = { user_id: string; name: string; role: string; played: number; wins: number; avg: number | null; best: number | null };
export type CemantixHistory = { users: { user_id: string; name: string; role: string }[]; stats: HistoryStat[]; days: HistoryDay[] };

export function useCemantixHistory() {
  return useQuery({ queryKey: ["cemantix", "history"], queryFn: () => api<CemantixHistory>("/cemantix/history") });
}
