// Nos versets : la liste des dossiers.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Loading, ScreenHeader } from "@/src/components/ui";
import { useFolders } from "@/src/features/verses/api";
import { FolderSheet } from "@/src/features/verses/FolderSheet";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function VersetsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, refetch, isRefetching } = useFolders();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: (body: { name: string; color: string }) => api("/verse-folders", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verse-folders"] });
      setOpen(false);
      toast("Dossier créé !");
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Nos versets" testID="verses-header" />
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          numColumns={2}
          keyExtractor={(f) => f.id}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 96, gap: 18 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="folders-empty" icon="folder" title="Aucun dossier" text="Crée un dossier pour y classer vos versets préférés." />
          }
          renderItem={({ item, index }) => (
            <Pressable
              testID={`folder-${item.id}`}
              onPress={() => router.push(`/versets/${item.id}`)}
              style={({ pressed }) => [styles.folderWrap, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={[styles.tab, { backgroundColor: item.color }]} />
              <View style={[styles.folder, { backgroundColor: item.color, transform: [{ rotate: index % 2 ? "0.8deg" : "-0.8deg" }] }]}>
                <Feather name="book-open" size={20} color={colors.houseInk} />
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.count}>
                  {item.count} verset{item.count > 1 ? "s" : ""}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <Pressable
        testID="add-folder-button"
        onPress={() => {
          setError("");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 16 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Feather name="folder-plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Nouveau dossier</Text>
      </Pressable>
      <FolderSheet
        visible={open}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        error={error}
        onSubmit={(v) => {
          setError("");
          if (!v.name.trim()) return setError("Donne un nom au dossier");
          create.mutate(v);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  folderWrap: { flex: 1, maxWidth: "48%" },
  tab: {
    width: "45%",
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: c.borderStrong,
    marginLeft: 8,
  },
  folder: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    padding: 14,
    gap: 4,
    marginTop: -1.5,
  },
  name: { fontFamily: fonts.hand, fontSize: 24, lineHeight: 26, color: c.houseInk },
  count: { fontFamily: fonts.body, fontSize: 12, color: c.houseInk, opacity: 0.7 },
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
