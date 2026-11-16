// Shared types + query hooks for houses.
import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export type House = {
  id: string;
  key: string;
  name: string;
  action: "link" | "page";
  target: string;
  x: number;
  y: number;
  visible: boolean;
  color: string;
  order: number;
  image_path: string | null;
};

export const useHouses = () => useQuery({ queryKey: ["houses"], queryFn: () => api<House[]>("/houses") });

export type AppSettings = { auto_layout: boolean };
export const useAppSettings = () =>
  useQuery({ queryKey: ["app-settings"], queryFn: () => api<AppSettings>("/settings") });
