// Écrire / modifier un chapitre (admin uniquement).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { Field, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useBook } from "@/src/features/books/api";
import { fonts, makeStyles } from "@/src/theme";

export default function EcrireScreen() {
  const { book: bookId, chapter: chapterId } = useLocalSearchParams<{ book: string; chapter?: string }>();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: book } = useBook(bookId);
  const existing = book?.chapters?.find((c) => c.id === chapterId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filled = useRef(false);

  useEffect(() => {
    // Fill the form once only, so a background refetch never erases typing.
    if (existing && !filled.current) {
      filled.current = true;
      setTitle(existing.title);
      setContent(existing.content);
    }
  }, [existing]);

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["book", bookId] });
    qc.invalidateQueries({ queryKey: ["books"] });
    toast(msg);
    router.back();
  };
  const save = useMutation({
    mutationFn: () =>
      chapterId
        ? api(`/chapters/${chapterId}`, { method: "PATCH", body: { title, content } })
        : api(`/books/${bookId}/chapters`, { method: "POST", body: { title, content } }),
    onSuccess: () => done(chapterId ? "Chapitre enregistré" : "Chapitre ajouté !"),
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(`/chapters/${chapterId}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmDelete(false);
      done("Chapitre supprimé");
    },
    onError: (e: Error) => {
      setConfirmDelete(false);
      toast(e.message);
    },
  });

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title={chapterId ? "Modifier" : "Nouveau chapitre"} testID="write-header" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 14 }}
      >
        {!!book && <Text style={styles.book}>dans « {book.title} »</Text>}
        <Field
          label="Titre du chapitre"
          testID="chapter-title-input"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setError("");
          }}
          placeholder="Le jour où on s'est rencontrés"
          maxLength={120}
        />
        <Field
          label="Le texte"
          testID="chapter-content-input"
          value={content}
          onChangeText={setContent}
          placeholder="Il était une fois..."
          multiline
          style={styles.content}
        />
        {!!error && <Text style={styles.error} testID="chapter-form-error">{error}</Text>}
        <SketchButton
          label="Enregistrer"
          icon="check"
          testID="chapter-save-button"
          loading={save.isPending}
          onPress={() => {
            if (!title.trim()) return setError("Donne un titre au chapitre");
            save.mutate();
          }}
        />
        {!!chapterId && (
          <SketchButton label="Supprimer ce chapitre" icon="trash-2" variant="ghost" testID="chapter-delete-button" onPress={() => setConfirmDelete(true)} />
        )}
      </KeyboardAwareScrollView>
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer ce chapitre ?" testID="chapter-delete-sheet">
        <Text style={styles.body}>« {title} » sera supprimé pour toujours.</Text>
        <SketchButton label="Oui, supprimer" variant="danger" testID="chapter-delete-confirm-button" loading={remove.isPending} onPress={() => remove.mutate()} />
        <SketchButton label="Annuler" variant="ghost" testID="chapter-delete-cancel-button" onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  book: { fontFamily: fonts.hand, fontSize: 22, color: c.muted },
  content: { minHeight: 320, textAlignVertical: "top", fontSize: 16, lineHeight: 26 },
  error: { fontFamily: fonts.bodyBold, color: c.error, fontSize: 14 },
  body: { fontFamily: fonts.body, fontSize: 15, color: c.onSurface },
}));
