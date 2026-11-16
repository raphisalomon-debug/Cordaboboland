// Objectifs de couple : proposer -> l'autre accepte/refuse -> actif -> accompli + trophée.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { GoalsTabs } from "@/src/features/goals/GoalsTabs";
import { EmptyState, Field, IconButton, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { TROPHIES } from "@/src/config/trophies";
import { Goal, useGoals } from "@/src/features/goals/api";
import { TrophyIcon } from "@/src/features/goals/TrophyIcon";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function ObjectifsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, refetch, isRefetching } = useGoals();

  const [proposeOpen, setProposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [completing, setCompleting] = useState<Goal | null>(null);
  const [trophy, setTrophy] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["trophies"] });
  };
  const action = useMutation({
    mutationFn: ({ path, method = "POST", body }: { path: string; method?: string; body?: object }) =>
      api(path, { method, body }),
    onSuccess: refresh,
    onError: (e: Error) => toast(e.message),
  });

  const propose = () => {
    setFormError("");
    if (!title.trim()) return setFormError("Donne un titre à l'objectif");
    action.mutate(
      { path: "/goals", body: { title, description: desc } },
      {
        onSuccess: () => {
          setProposeOpen(false);
          setTitle("");
          setDesc("");
          toast("Objectif proposé !");
        },
      },
    );
  };

  const complete = () => {
    if (!completing || !trophy) return;
    action.mutate(
      { path: `/goals/${completing.id}/complete`, body: { trophy } },
      {
        onSuccess: () => {
          setCompleting(null);
          setTrophy(null);
          toast("Bravo ! Le trophée est sur l'étagère");
        },
      },
    );
  };

  const goals = data ?? [];
  const pending = goals.filter((g) => g.status === "pending");
  const active = goals.filter((g) => g.status === "active");
  const refused = goals.filter((g) => g.status === "refused");

  const card = (g: Goal, i: number, footer: React.ReactNode) => (
    <View key={g.id} style={[styles.card, { transform: [{ rotate: i % 2 ? "0.6deg" : "-0.6deg" }] }]} testID={`goal-card-${g.id}`}>
      <Text style={styles.cardTitle}>{g.title}</Text>
      {!!g.description && <Text style={styles.cardDesc}>{g.description}</Text>}
      <Text style={styles.by}>proposé par {g.proposed_by_name}</Text>
      {footer}
    </View>
  );

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Objectifs et trophées" testID="goals-header" />
      <GoalsTabs current="objectifs" />
      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          {pending.length + active.length + refused.length === 0 && (
            <EmptyState testID="goals-empty" icon="flag" title="Aucun objectif" text="Propose votre premier objectif de couple !" />
          )}

          {pending.length > 0 && <Text style={styles.section}>À valider</Text>}
          {pending.map((g, i) =>
            card(
              g,
              i,
              g.proposed_by === user?.id ? (
                <View style={styles.row}>
                  <View style={styles.waiting}>
                    <Feather name="clock" size={14} color={colors.muted} />
                    <Text style={styles.waitingText}>En attente de réponse</Text>
                  </View>
                  <Pressable testID={`goal-delete-${g.id}`} hitSlop={8} onPress={() => action.mutate({ path: `/goals/${g.id}`, method: "DELETE" })}>
                    <Feather name="trash-2" size={17} color={colors.muted} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.row}>
                  <SketchButton
                    label="Refuser"
                    variant="secondary"
                    testID={`goal-refuse-${g.id}`}
                    style={{ flex: 1 }}
                    onPress={() => action.mutate({ path: `/goals/${g.id}/refuse` })}
                  />
                  <SketchButton
                    label="Accepter"
                    icon="check"
                    testID={`goal-accept-${g.id}`}
                    style={{ flex: 1 }}
                    onPress={() => action.mutate({ path: `/goals/${g.id}/accept` }, { onSuccess: () => toast("Objectif actif !") })}
                  />
                </View>
              ),
            ),
          )}

          {active.length > 0 && <Text style={styles.section}>En cours</Text>}
          {active.map((g, i) =>
            card(
              g,
              i,
              <SketchButton
                label="C'est accompli !"
                icon="star"
                testID={`goal-complete-${g.id}`}
                onPress={() => {
                  setTrophy(null);
                  setCompleting(g);
                }}
              />,
            ),
          )}

          {refused.length > 0 && <Text style={styles.section}>Refusés</Text>}
          {refused.map((g, i) =>
            card(
              g,
              i,
              <View style={styles.row}>
                <Text style={styles.waitingText}>Pas pour cette fois</Text>
                <Pressable testID={`goal-delete-${g.id}`} hitSlop={8} onPress={() => action.mutate({ path: `/goals/${g.id}`, method: "DELETE" })}>
                  <Feather name="trash-2" size={17} color={colors.muted} />
                </Pressable>
              </View>,
            ),
          )}
        </ScrollView>
      )}

      <Pressable
        testID="propose-goal-button"
        onPress={() => {
          setFormError("");
          setProposeOpen(true);
        }}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 16 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Proposer</Text>
      </Pressable>

      <Sheet visible={proposeOpen} onClose={() => setProposeOpen(false)} title="Un nouvel objectif" testID="propose-goal-sheet">
        <Field label="Titre" testID="goal-title-input" value={title} onChangeText={setTitle} placeholder="Courir un 10 km ensemble" />
        <Field
          label="En quelques mots"
          testID="goal-desc-input"
          value={desc}
          onChangeText={setDesc}
          placeholder="Avant l'été, en s'entraînant le dimanche"
          multiline
          maxLength={300}
        />
        {!!formError && <Text style={styles.error} testID="goal-form-error">{formError}</Text>}
        <SketchButton label="Proposer" testID="goal-submit-button" onPress={propose} loading={action.isPending} />
      </Sheet>

      <Sheet visible={!!completing} onClose={() => setCompleting(null)} title="Choisis un trophée" testID="trophy-picker-sheet">
        <Text style={styles.cardDesc}>{completing?.title}</Text>
        <View style={styles.trophyGrid}>
          {TROPHIES.map((t) => (
            <Pressable
              key={t.key}
              testID={`trophy-option-${t.key}`}
              onPress={() => setTrophy(t.key)}
              style={[styles.trophyCell, trophy === t.key && styles.trophySelected]}
            >
              <TrophyIcon trophy={t.key} size={48} />
              <Text style={styles.trophyLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <SketchButton
          label="Poser sur l'étagère"
          icon="award"
          testID="confirm-complete-button"
          disabled={!trophy}
          loading={action.isPending}
          onPress={complete}
        />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  section: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface, marginTop: 8 },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: c.border,
    gap: 6,
  },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.onSurfaceSecondary },
  cardDesc: { fontFamily: fonts.hand, fontSize: 20, color: c.onSurfaceSecondary },
  by: { fontFamily: fonts.body, fontSize: 12, color: c.muted, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  waiting: { flexDirection: "row", alignItems: "center", gap: 6 },
  waitingText: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
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
  trophyGrid: { flexDirection: "row", flexWrap: "wrap" },
  trophyCell: { width: "25%", alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", gap: 2 },
  trophySelected: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  trophyLabel: { fontFamily: fonts.body, fontSize: 11, color: c.onSurface },
}));
