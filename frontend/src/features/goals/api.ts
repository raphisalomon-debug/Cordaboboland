import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Goal = {
  id: string;
  title: string;
  description: string;
  proposed_by: string;
  proposed_by_name: string;
  status: "pending" | "active" | "refused" | "completed";
  trophy: string | null;
  created_at: string;
  completed_at: string | null;
};

export const useGoals = () => useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
export const useTrophies = () => useQuery({ queryKey: ["trophies"], queryFn: () => api<Goal[]>("/trophies") });
