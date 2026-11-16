// Librairie : les petits livres sur des étagères. Seul l'admin (l'auteur) en ajoute.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Loading, ScreenHeader } from "@/src/components/ui";
import { Book, BOOK_COLORS, BOOK_SHEET_LABELS, useBooks } from "@/src/features/books/api";
import { BookCover } from "@/src/features/books/BookCover";
import { FolderSheet } from "@/src/features/verses/FolderSheet";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const PER_SHELF = 3;

export default function LibrairieScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const isAuthor = user?.role === "admin";
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, refetch, isRefetching } = useBooks();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: (body: { name: string; color: string }) => api<Book>("/books", { method: "POST", body }),
    onSuccess: (book) => {
      qc.invalidateQueries({ queryKey: ["books"] });
      setOpen(false);
      toast("Livre créé ! Ajoute son premier chapitre");
      router.push(`/librairie/${book.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const books = data ?? [];
  const shelves: Book[][] = [];
  for (let i = 0; i < books.length; i += PER_SHELF) shelves.push(books.slice(i, i + PER_SHELF));
  const coverW = Math.min(110, (width - 32 - 24 * PER_SHELF) / PER_SHELF);

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Librairie" testID="library-header" />
      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 96, gap: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          {books.length === 0 && (
            <EmptyState
              testID="library-empty"
              icon="book"
              title="Les étagères sont vides"
              text={isAuthor ? "Écris ton premier petit livre pour elle." : "Bientôt, des petits livres écrits rien que pour toi."}
            />
          )}
          {shelves.map((row, i) => (
            <View key={i} testID={`library-shelf-${i}`}>
              <View style={styles.row}>
                {row.map((b, j) => (
                  <Pressable
                    key={b.id}
                    testID={`book-${b.id}`}
                    onPress={() => router.push(`/librairie/${b.id}`)}
                    style={({ pressed }) => [
                      { transform: [{ rotate: j === 1 ? "1deg" : j === 2 ? "-1.2deg" : "0deg" }, { translateY: pressed ? -6 : 0 }] },
                    ]}
                  >
                    <BookCover book={b} width={coverW} />
                  </Pressable>
                ))}
              </View>
              <View style={styles.plank} />
              <View style={styles.plankEdge} />
            </View>
          ))}
        </ScrollView>
      )}
      {isAuthor && (
        <Pressable
          testID="add-book-button"
          onPress={() => {
            setError("");
            setOpen(true);
          }}
          style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 16 }, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Feather name="feather" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.fabText}>Nouveau livre</Text>
        </Pressable>
      )}
      <FolderSheet
        visible={open}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        error={error}
        labels={BOOK_SHEET_LABELS}
        onSubmit={(v) => {
          setError("");
          if (!v.name.trim()) return setError("Donne un titre au livre");
          create.mutate({ ...v, color: v.color || BOOK_COLORS[0] });
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-evenly", minHeight: 120 },
  plank: { height: 14, backgroundColor: c.wood, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: c.woodDark },
  plankEdge: { height: 6, backgroundColor: c.woodDark, marginHorizontal: 2, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
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
