// Un dossier de versets : liste, ajout, modification, déplacement, suppression.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Field, IconButton, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useFolder, useFolders, useVerses, Verse } from "@/src/features/verses/api";
import { FolderSheet } from "@/src/features/verses/FolderSheet";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: folder } = useFolder(id);
  const { data: folders } = useFolders();
  const { data, isLoading, refetch, isRefetching } = useVerses(id);

  const [editing, setEditing] = useState<Verse | "new" | null>(null);
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [targetFolder, setTargetFolder] = useState(id);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["verses"] });
    qc.invalidateQueries({ queryKey: ["verse-folders"] });
    qc.invalidateQueries({ queryKey: ["verse-folder", id] });
  };
  const call = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: object }) => api(path, { method, body }),
    onSuccess: refresh,
    onError: (e: Error) => {
      setError(e.message);
      toast(e.message);
    },
  });

  const openVerse = (v: Verse | "new") => {
    setError("");
    setReference(v === "new" ? "" : v.reference);
    setText(v === "new" ? "" : v.text);
    setNote(v === "new" ? "" : v.note);
    setTargetFolder(id);
    setEditing(v);
  };

  const saveVerse = () => {
    setError("");
    if (!reference.trim()) return setError("Indique la référence (ex : Jean 3:16)");
    const body = { reference, text, note, folder_id: targetFolder };
    call.mutate(
      editing === "new"
        ? { path: "/verses", method: "POST", body }
        : { path: `/verses/${(editing as Verse).id}`, method: "PATCH", body },
      {
        onSuccess: () => {
          setEditing(null);
          toast(editing === "new" ? "Verset ajouté !" : targetFolder !== id ? "Verset déplacé" : "Verset modifié");
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader
        title={folder?.name ?? "Dossier"}
        testID="folder-header"
        right={<IconButton icon="more-horizontal" testID="folder-menu-button" onPress={() => setMenu(true)} />}
      />
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="verses-empty" icon="book" title="Dossier vide" text="Ajoute votre premier verset dans ce dossier." />
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`verse-${item.id}`}
              onPress={() => openVerse(item)}
              style={({ pressed }) => [styles.card, { borderLeftColor: folder?.color ?? colors.brand }, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.ref}>{item.reference}</Text>
              {!!item.text && <Text style={styles.text}>« {item.text} »</Text>}
              {!!item.note && <Text style={styles.note}>{item.note}</Text>}
              <Text style={styles.by}>ajouté par {item.created_by_name}</Text>
            </Pressable>
          )}
        />
      )}
      <Pressable
        testID="add-verse-button"
        onPress={() => openVerse("new")}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 16 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Ajouter un verset</Text>
      </Pressable>

      {/* Add / edit verse */}
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouveau verset" : "Le verset"} testID="verse-sheet">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
          <Field label="Référence" testID="verse-reference-input" value={reference} onChangeText={(v) => { setReference(v); setError(""); }} placeholder="Jean 3:16" />
          <Field label="Le texte" testID="verse-text-input" value={text} onChangeText={setText} placeholder="Car Dieu a tant aimé le monde..." multiline style={{ minHeight: 90, textAlignVertical: "top" }} />
          <Field label="Une note ? (facultatif)" testID="verse-note-input" value={note} onChangeText={setNote} placeholder="Lu ensemble le jour de..." multiline />
          {editing !== "new" && (folders?.length ?? 0) > 1 && (
            <>
              <Text style={styles.label}>Dossier</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {folders!.map((f) => (
                  <Pressable
                    key={f.id}
                    testID={`verse-move-${f.id}`}
                    onPress={() => setTargetFolder(f.id)}
                    style={[styles.chip, { backgroundColor: f.color }, targetFolder === f.id && styles.chipActive]}
                  >
                    <Text style={styles.chipText} numberOfLines={1}>{f.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
          {!!error && <Text style={styles.error} testID="verse-form-error">{error}</Text>}
          <SketchButton label="Enregistrer" testID="verse-submit-button" loading={call.isPending} onPress={saveVerse} />
          {editing !== "new" && editing && (
            <SketchButton
              label="Supprimer ce verset"
              icon="trash-2"
              variant="ghost"
              testID="verse-delete-button"
              onPress={() =>
                call.mutate({ path: `/verses/${editing.id}`, method: "DELETE" }, { onSuccess: () => { setEditing(null); toast("Verset supprimé"); } })
              }
            />
          )}
        </ScrollView>
      </Sheet>

      {/* Folder menu */}
      <Sheet visible={menu} onClose={() => setMenu(false)} title="Le dossier" testID="folder-menu-sheet">
        <SketchButton label="Renommer / couleur" icon="edit-2" variant="secondary" testID="folder-rename-button" onPress={() => { setMenu(false); setError(""); setRenameOpen(true); }} />
        <SketchButton label="Supprimer le dossier" icon="trash-2" variant="ghost" testID="folder-delete-button" onPress={() => { setMenu(false); setConfirmDelete(true); }} />
      </Sheet>

      <FolderSheet
        visible={renameOpen}
        onClose={() => setRenameOpen(false)}
        initial={folder ? { name: folder.name, color: folder.color } : undefined}
        loading={call.isPending}
        error={error}
        onSubmit={(v) => {
          setError("");
          if (!v.name.trim()) return setError("Donne un nom au dossier");
          call.mutate({ path: `/verse-folders/${id}`, method: "PATCH", body: v }, { onSuccess: () => { setRenameOpen(false); toast("Dossier mis à jour"); } });
        }}
      />

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer ce dossier ?" testID="folder-delete-sheet">
        <Text style={styles.body}>
          Le dossier « {folder?.name} » et ses {data?.length ?? 0} verset(s) seront supprimés.
        </Text>
        <SketchButton
          label="Oui, supprimer"
          variant="danger"
          testID="folder-delete-confirm-button"
          loading={call.isPending}
          onPress={() =>
            call.mutate({ path: `/verse-folders/${id}`, method: "DELETE" }, { onSuccess: () => { setConfirmDelete(false); toast("Dossier supprimé"); if (router.canGoBack()) router.back(); else router.replace("/versets"); } })
          }
        />
        <SketchButton label="Annuler" variant="ghost" testID="folder-delete-cancel-button" onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderLeftWidth: 6,
    borderColor: c.border,
    gap: 6,
  },
  ref: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurfaceSecondary },
  text: { fontFamily: fonts.hand, fontSize: 22, lineHeight: 25, color: c.onSurfaceSecondary },
  note: { fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceSecondary, fontStyle: "italic" },
  by: { fontFamily: fonts.body, fontSize: 11, color: c.muted },
  body: { fontFamily: fonts.body, fontSize: 15, color: c.onSurface },
  label: { fontFamily: fonts.hand, fontSize: 22, color: c.onSurface },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: "center", borderWidth: 1.5, borderColor: c.border, flexShrink: 0, maxWidth: 180 },
  chipActive: { borderColor: c.brandPrimary, borderWidth: 2.5 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: c.houseInk },
  error: { fontFamily: fonts.bodyBold, color: c.error, fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: c.brandPrimary,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fabText: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.onBrandPrimary },
}));
