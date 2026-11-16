import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Folder = { id: string; name: string; color: string; count: number; created_by_name: string };
export type Verse = {
  id: string;
  folder_id: string;
  reference: string;
  text: string;
  note: string;
  created_by_name: string;
  created_at: string;
};

// Couleurs pastel proposées pour les dossiers (modifiable ici).
export const FOLDER_COLORS = ["#FAEDCD", "#F6C6C6", "#C9DDF0", "#CCD5AE", "#E3D3EE", "#F2D7B6", "#D6E5D8", "#F8D8E4"];

export const useFolders = () => useQuery({ queryKey: ["verse-folders"], queryFn: () => api<Folder[]>("/verse-folders") });
export const useFolder = (id: string) =>
  useQuery({ queryKey: ["verse-folder", id], queryFn: () => api<Folder>(`/verse-folders/${id}`) });
export const useVerses = (folderId: string) =>
  useQuery({ queryKey: ["verses", folderId], queryFn: () => api<Verse[]>(`/verse-folders/${folderId}/verses`) });
