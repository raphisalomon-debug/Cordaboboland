// Voyages : types et hooks (miroir de backend/features/voyages.py).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { api, API_URL, authHeaders } from "@/src/api";
import { uploadForm } from "@/src/utils/upload";

export type Visited = { code: string; color: string; visited_on: string };
export type Wish = { code: string; user_id: string; user_name: string; why: string };
export type Entry = {
  id: string;
  code: string;
  author_id: string;
  author_name: string;
  text: string;
  place: string;
  date: string;
  photo_path: string | null;
  pin: { x: number; y: number } | null;
  created_at: string;
};
export type Idea = { id: string; code: string; text: string; done: boolean; author_name: string };
export type Trip = { code: string; date: string; title: string };
export type Overview = { visited: Visited[]; wishes: Wish[]; pins: Entry[]; memories: Record<string, number>; trip: Trip | null };
export type CountryDetail = { code: string; visit: Visited | null; wishes: Wish[]; entries: Entry[]; ideas: Idea[] };

/** Couleurs proposées pour un pays visité (la première est celle par défaut). */
export const VISIT_COLORS = ["#E8826B", "#E9C46A", "#8FB07A", "#7FB3D5", "#B79CD6", "#EDA1BD", "#F2B07A", "#81B29A"];

const OVERVIEW = ["voyages", "overview"];
const detailKey = (code: string) => ["voyages", "country", code];

export const useOverview = () => useQuery({ queryKey: OVERVIEW, queryFn: () => api<Overview>("/voyages/overview") });
export const useCountry = (code: string) => useQuery({ queryKey: detailKey(code), queryFn: () => api<CountryDetail>(`/voyages/${code}`) });

export function useVoyageActions(code?: string) {
  const qc = useQueryClient();
  const afterDetail = (d: CountryDetail) => {
    qc.setQueryData(detailKey(d.code), d);
    qc.invalidateQueries({ queryKey: OVERVIEW });
  };
  const c = code ?? "";
  return {
    setVisit: useMutation({
      mutationFn: (v: { color: string; visited_on?: string }) =>
        api<CountryDetail>(`/voyages/${c}`, { method: "PUT", body: { color: v.color, visited_on: v.visited_on ?? "" } }),
      onSuccess: afterDetail,
    }),
    clearVisit: useMutation({ mutationFn: () => api<CountryDetail>(`/voyages/${c}`, { method: "DELETE" }), onSuccess: afterDetail }),
    setWish: useMutation({
      mutationFn: (why: string) => api<CountryDetail>(`/voyages/${c}/wish`, { method: "PUT", body: { why } }),
      onSuccess: afterDetail,
    }),
    clearWish: useMutation({ mutationFn: () => api<CountryDetail>(`/voyages/${c}/wish`, { method: "DELETE" }), onSuccess: afterDetail }),
    addEntry: useMutation({
      mutationFn: (e: { text: string; place: string; date: string; photo_path: string | null; pin: { x: number; y: number } | null }) =>
        api<CountryDetail>(`/voyages/${c}/entries`, { method: "POST", body: e }),
      onSuccess: afterDetail,
    }),
    deleteEntry: useMutation({
      mutationFn: (id: string) => api(`/voyages/entries/${id}`, { method: "DELETE" }),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["voyages"] });
      },
    }),
    addIdea: useMutation({
      mutationFn: (text: string) => api<CountryDetail>(`/voyages/${c}/ideas`, { method: "POST", body: { text } }),
      onSuccess: afterDetail,
    }),
    toggleIdea: useMutation({
      mutationFn: (v: { id: string; done: boolean }) => api(`/voyages/ideas/${v.id}`, { method: "PATCH", body: { done: v.done } }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["voyages"] }),
    }),
    deleteIdea: useMutation({
      mutationFn: (id: string) => api(`/voyages/ideas/${id}`, { method: "DELETE" }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["voyages"] }),
    }),
    setTrip: useMutation({
      mutationFn: (t: Trip) => api<Trip>("/voyages/trip", { method: "PUT", body: t }),
      onSuccess: () => qc.invalidateQueries({ queryKey: OVERVIEW }),
    }),
    clearTrip: useMutation({
      mutationFn: () => api("/voyages/trip", { method: "DELETE" }),
      onSuccess: () => qc.invalidateQueries({ queryKey: OVERVIEW }),
    }),
  };
}

/** Choisit une photo dans la galerie et l'envoie (réduite côté serveur). Retourne son chemin, ou null si annulé. */
export async function pickAndUploadPhoto(onDenied: () => void): Promise<{ path: string; preview: string } | null> {
  let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    onDenied();
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const r = await uploadForm(`${API_URL}/voyages/photo`, {
    headers: authHeaders(),
    files: { file: { uri: asset.uri, name: asset.fileName ?? "photo.jpg", mimeType: asset.mimeType ?? "image/jpeg" } },
  });
  if (!r.ok) {
    const d = await r.json().catch(() => null);
    throw new Error(d?.detail && typeof d.detail === "string" ? d.detail : `Envoi de la photo impossible (${r.status})`);
  }
  const data = (await r.json()) as { path: string };
  return { path: data.path, preview: asset.uri };
}
