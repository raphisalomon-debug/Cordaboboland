// Un livre : couverture, table des matières, reprendre la lecture. L'auteur peut écrire/éditer.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { IconButton, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { BOOK_SHEET_LABELS, pickCover, progressKey, useBook } from "@/src/features/books/api";
import { BookCover } from "@/src/features/books/BookCover";
import { FolderSheet } from "@/src/features/verses/FolderSheet";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isAuthor = user?.role === "admin";
  const qc = useQueryClient();
  const toast = useToast();
  const { data: book, isLoading } = useBook(id);
  const [progress, setProgress] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      storage.getItem(progressKey(id), null).then((v) => setProgress(typeof v === "number" ? v : null));
    }, [id]),
  );

  const call = useMutation({
    mutationFn: ({ method, body }: { method: string; body?: object }) => api(`/books/${id}`, { method, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book", id] });
    },
    onError: (e: Error) => {
      setError(e.message);
      toast(e.message);
    },
  });

  const setCover = async (source: "camera" | "library") => {
    setCoverBusy(true);
    try {
      const path = await pickCover(source, () => toast(source === "camera" ? "Accès à l'appareil photo refusé" : "Accès aux photos refusé"));
      if (path) {
        await call.mutateAsync({ method: "PATCH", body: { cover_path: path } });
        setMenu(false);
        toast("Couverture mise à jour 📖");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setCoverBusy(false);
    }
  };

  const chapters = book?.chapters ?? [];
  const resumeAt = progress !== null && progress < chapters.length ? progress : 0;

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader
        title={book?.title ?? "Livre"}
        testID="book-header"
        right={isAuthor ? <IconButton icon="more-horizontal" testID="book-menu-button" onPress={() => setMenu(true)} /> : undefined}
      />
      {isLoading || !book ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
          <View style={styles.top}>
            <BookCover book={book} width={120} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.by}>écrit par {book.author_name}</Text>
              <Text style={styles.count} testID="book-chapter-count">
                {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
              </Text>
              {chapters.length > 0 && (
                <SketchButton
                  label={progress !== null && progress > 0 ? "Reprendre" : "Commencer"}
                  icon="book-open"
                  testID="book-read-button"
                  onPress={() => router.push({ pathname: "/lecture", params: { book: id, i: String(resumeAt) } })}
                />
              )}
            </View>
          </View>

          <Text style={styles.section}>Sommaire</Text>
          {chapters.length === 0 && (
            <Text style={styles.empty} testID="book-no-chapters">
              {isAuthor ? "Pas encore de chapitre : à toi d'écrire !" : "L'histoire n'a pas encore commencé..."}
            </Text>
          )}
          {chapters.map((ch, i) => (
            <View key={ch.id} style={styles.chapter}>
              <Pressable
                testID={`chapter-${ch.id}`}
                style={({ pressed }) => [styles.chapterMain, pressed && { opacity: 0.7 }]}
                onPress={() => router.push({ pathname: "/lecture", params: { book: id, i: String(i) } })}
              >
                <Text style={styles.chapterNum}>{i + 1}</Text>
                <Text style={styles.chapterTitle} numberOfLines={2}>
                  {ch.title}
                </Text>
                {progress === i && <Feather name="bookmark" size={16} color={colors.brandPrimary} />}
              </Pressable>
              {isAuthor && (
                <Pressable
                  testID={`chapter-edit-${ch.id}`}
                  hitSlop={8}
                  style={styles.edit}
                  onPress={() => router.push({ pathname: "/ecrire", params: { book: id, chapter: ch.id } })}
                >
                  <Feather name="edit-2" size={16} color={colors.onSurfaceSecondary} />
                </Pressable>
              )}
            </View>
          ))}
          {isAuthor && (
            <SketchButton
              label="Écrire un chapitre"
              icon="feather"
              variant="secondary"
              testID="add-chapter-button"
              onPress={() => router.push({ pathname: "/ecrire", params: { book: id } })}
            />
          )}
        </ScrollView>
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Le livre" testID="book-menu-sheet">
        <SketchButton label="Photographier la couverture" icon="camera" testID="book-cover-camera" loading={coverBusy} onPress={() => setCover("camera")} />
        <SketchButton label="Choisir une photo" icon="image" variant="secondary" testID="book-cover-library" disabled={coverBusy} onPress={() => setCover("library")} />
        {!!book?.cover_path && (
          <SketchButton label="Retirer la photo" icon="x" variant="ghost" testID="book-cover-remove" onPress={() => call.mutate({ method: "PATCH", body: { remove_cover: true } }, { onSuccess: () => { setMenu(false); toast("Photo retirée"); } })} />
        )}
        <SketchButton label="Titre / couleur" icon="edit-2" variant="secondary" testID="book-edit-button" onPress={() => { setMenu(false); setError(""); setEditOpen(true); }} />
        <SketchButton label="Supprimer le livre" icon="trash-2" variant="ghost" testID="book-delete-button" onPress={() => { setMenu(false); setConfirmDelete(true); }} />
      </Sheet>
      <FolderSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        initial={book ? { name: book.title, color: book.color } : undefined}
        labels={BOOK_SHEET_LABELS}
        loading={call.isPending}
        error={error}
        onSubmit={(v) => {
          setError("");
          if (!v.name.trim()) return setError("Donne un titre au livre");
          call.mutate({ method: "PATCH", body: v }, { onSuccess: () => { setEditOpen(false); toast("Livre mis à jour"); } });
        }}
      />
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer ce livre ?" testID="book-delete-sheet">
        <Text style={styles.body}>« {book?.title} » et ses {chapters.length} chapitre(s) seront supprimés pour toujours.</Text>
        <SketchButton
          label="Oui, supprimer"
          variant="danger"
          testID="book-delete-confirm-button"
          loading={call.isPending}
          onPress={() =>
            call.mutate({ method: "DELETE" }, { onSuccess: () => { setConfirmDelete(false); toast("Livre supprimé"); if (router.canGoBack()) router.back(); else router.replace("/librairie"); } })
          }
        />
        <SketchButton label="Annuler" variant="ghost" testID="book-delete-cancel-button" onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  top: { flexDirection: "row", gap: 16, alignItems: "flex-end", paddingTop: 8 },
  by: { fontFamily: fonts.hand, fontSize: 22, color: c.onSurface },
  count: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginBottom: 4 },
  section: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface, marginTop: 4 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  chapter: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  chapterMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 52 },
  chapterNum: { fontFamily: fonts.hand, fontSize: 26, color: c.brandPrimary, width: 26, textAlign: "center" },
  chapterTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurfaceSecondary },
  edit: { width: 48, height: 52, alignItems: "center", justifyContent: "center" },
  body: { fontFamily: fonts.body, fontSize: 15, color: c.onSurface },
}));
