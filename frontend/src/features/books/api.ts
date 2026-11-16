import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Chapter = { id: string; book_id: string; title: string; content: string; order: number };
export type Book = {
  id: string;
  title: string;
  color: string;
  author_name: string;
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
