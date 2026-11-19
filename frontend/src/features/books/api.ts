import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { api, API_URL, authHeaders } from "@/src/api";
import { uploadForm } from "@/src/utils/upload";

export type Chapter = { id: string; book_id: string; title: string; content: string; order: number };
export type Book = {
  id: string;
  title: string;
  color: string;
  author_name: string;
  cover_path?: string | null;
  created_at: string;
  updated_at: string;
  chapter_count?: number;
  chapters?: Chapter[];
};

// Couleurs de couverture proposées (modifiable ici).
export const BOOK_COLORS = ["#F8D8E4", "#F6C6C6", "#C9DDF0", "#CCD5AE", "#E3D3EE", "#F2D7B6", "#D6E5D8", "#FAEDCD"];

export const useBooks = () => useQuery({ queryKey: ["books"], queryFn: () => api<Book[]>("/books") });
export const useBook = (id: string) => useQuery({ queryKey: ["book", id], queryFn: () => api<Book>(`/books/${id}`) });

/** Labels for the shared name + colour sheet when used for books. */
export const BOOK_SHEET_LABELS = {
  create: "Nouveau livre",
  edit: "Modifier le livre",
  field: "Titre du livre",
  placeholder: "L'histoire de nous deux",
  submit: "Créer le livre",
};

/** Local reading progress (chapter index) for each book. */
export const progressKey = (bookId: string) => `book_progress_${bookId}`;

/** Updated during the last 3 days -> "Nouveau" ribbon. */
export const isNew = (b: Book) => Date.now() - new Date(b.updated_at).getTime() < 3 * 24 * 3600 * 1000;

/** Prend (appareil photo) ou choisit (galerie) la photo d'une couverture et l'envoie. Retourne son chemin, ou null si annulé. */
export async function pickCover(source: "camera" | "library", onDenied: () => void): Promise<string | null> {
  const camera = source === "camera";
  let perm = camera ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) {
    perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (!perm.granted) {
    onDenied();
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85 };
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const r = await uploadForm(`${API_URL}/books/cover`, {
    headers: authHeaders(),
    files: { file: { uri: asset.uri, name: asset.fileName ?? "cover.jpg", mimeType: asset.mimeType ?? "image/jpeg" } },
  });
  if (!r.ok) {
    const d = await r.json().catch(() => null);
    throw new Error(d?.detail && typeof d.detail === "string" ? d.detail : `Envoi de la photo impossible (${r.status})`);
  }
  return ((await r.json()) as { path: string }).path;
}
