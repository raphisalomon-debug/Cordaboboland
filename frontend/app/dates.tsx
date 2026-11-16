// Nos dates : idées de sorties à faire ensemble ("à faire" / "déjà fait").
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { FlatList, Platform, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Field, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

dayjs.locale("fr");

type DateIdea = {
  id: string;
  title: string;
  note: string;
  planned_date: string | null;
  done: boolean;
  created_by_name: string;
  created_at: string;
  done_at: string | null;
};

// "25/12/2026" -> "2026-12-25" (or null when empty / invalid)
function parseFrDate(v: string): string | null | "invalid" {
  if (!v.trim()) return null;
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "invalid";
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dayjs(iso).isValid() && dayjs(iso).format("YYYY-MM-DD") === iso ? iso : "invalid";
}

export default function DatesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [sheet, setSheet] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dates"],
    queryFn: () => api<DateIdea[]>("/dates"),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dates"] });

  const create = useMutation({
    mutationFn: (body: object) => api("/dates", { method: "POST", body }),
    onSuccess: () => {
      refresh();
      setSheet(false);
      setTitle("");
      setDate("");
      setNote("");
      toast("Idée ajoutée !");
    },
    onError: (e: Error) => setFormError(e.message),
  });
  const toggle = useMutation({
    mutationFn: (d: DateIdea) => api(`/dates/${d.id}`, { method: "PATCH", body: { done: !d.done } }),
    onSuccess: refresh,
    onError: (e: Error) => toast(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/dates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast("Idée supprimée");
    },
    onError: (e: Error) => toast(e.message),
  });

  const todo = (data ?? [])
    .filter((d) => !d.done)
    .sort((a, b) => (a.planned_date ?? "9999").localeCompare(b.planned_date ?? "9999"));
  const done = (data ?? []).filter((d) => d.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const list = tab === "todo" ? todo : done;

  const submit = () => {
    setFormError("");
    if (!title.trim()) return setFormError("Donne un petit nom à cette idée");
    const planned = parseFrDate(date);
    if (planned === "invalid") return setFormError("Date au format JJ/MM/AAAA");
    create.mutate({ title, note, planned_date: planned });
  };

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Nos dates" testID="dates-header" />
      <View style={styles.tabs}>
        {(["todo", "done"] as const).map((t) => (
          <Pressable
            key={t}
            testID={`dates-tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "todo" ? `À faire (${todo.length})` : `Déjà fait (${done.length})`}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            tab === "todo" ? (
              <EmptyState testID="dates-empty" icon="map" title="Aucune idée pour l'instant" text="Ajoute votre première idée de date !" />
            ) : (
              <EmptyState testID="dates-done-empty" icon="check-circle" title="Rien de coché" text="Les dates faites apparaîtront ici." />
            )
          }
          renderItem={({ item, index }) => (
            <View style={[styles.card, { transform: [{ rotate: index % 2 ? "0.4deg" : "-0.4deg" }] }]} testID={`date-item-${item.id}`}>
              <Pressable
                testID={`date-toggle-${item.id}`}
                hitSlop={10}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  toggle.mutate(item);
                }}
                style={[styles.check, item.done && styles.checkDone]}
              >
                {item.done && <Feather name="check" size={18} color={colors.onSuccess} />}
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.itemTitle, item.done && styles.itemDone]}>{item.title}</Text>
                {!!item.planned_date && (
                  <View style={styles.meta}>
                    <Feather name="calendar" size={13} color={colors.brandPrimary} />
                    <Text style={styles.metaText}>{dayjs(item.planned_date).format("dddd D MMMM YYYY")}</Text>
                  </View>
                )}
                {!!item.note && <Text style={styles.note}>{item.note}</Text>}
                <Text style={styles.by}>idée de {item.created_by_name}</Text>
              </View>
              <Pressable testID={`date-delete-${item.id}`} hitSlop={10} onPress={() => remove.mutate(item.id)} style={styles.trash}>
                <Feather name="trash-2" size={17} color={colors.muted} />
              </Pressable>
            </View>
          )}
        />
      )}
      <Pressable
        testID="add-date-button"
        onPress={() => {
          setFormError("");
          setSheet(true);
        }}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 16 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Nouvelle idée</Text>
      </Pressable>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Une idée de date" testID="add-date-sheet">
        <Field label="Quoi ?" testID="date-title-input" value={title} onChangeText={setTitle} placeholder="Pique-nique au parc" />
        <Field
          label="Quand ? (facultatif)"
          testID="date-date-input"
          value={date}
          onChangeText={setDate}
          placeholder="JJ/MM/AAAA"
          keyboardType={Platform.OS === "web" ? "default" : "numbers-and-punctuation"}
        />
        <Field label="Une note ? (facultatif)" testID="date-note-input" value={note} onChangeText={setNote} placeholder="Prendre la couverture à carreaux" multiline />
        {!!formError && <Text style={styles.error} testID="date-form-error">{formError}</Text>}
        <SketchButton label="Ajouter" testID="date-submit-button" onPress={submit} loading={create.isPending} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  tabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
  },
  tabActive: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.muted },
  tabTextActive: { color: c.onBrandTertiary },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkDone: { backgroundColor: c.success, borderColor: c.success },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurfaceSecondary },
  itemDone: { textDecorationLine: "line-through", color: c.muted },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceSecondary },
  note: { fontFamily: fonts.hand, fontSize: 19, color: c.onSurfaceSecondary },
  by: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  trash: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
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
  error: { fontFamily: fonts.bodyBold, color: c.error, fontSize: 14 },
}));
