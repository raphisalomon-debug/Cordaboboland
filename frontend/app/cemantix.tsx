// Cémantix : course quotidienne. Celui qui trouve le mot du jour en le moins d'essais est roi / reine du jour.
import { Feather } from "@react-native-vector-icons/feather";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Linking, Platform, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { crownTitle, useCemantix, useCemantixActions } from "@/src/features/cemantix/api";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";

dayjs.locale("fr");

const hour = (iso: string) => dayjs(iso).format("HH:mm");

export default function CemantixScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useCemantix();
  const { found, undo } = useCemantixActions();

  const winner = data?.winner ?? null;
  const iWon = !!winner && winner.user_id === user?.id;
  const myClaim = data?.claims.find((c) => c.user_id === user?.id);
  const loser = data?.claims.find((c) => c.rank === 2) ?? null;

  const [word, setWord] = useState("");
  const [tries, setTries] = useState("");
  const status = data?.me_status ?? null;
  const pendingMine = status === "pending";
  const verifiedMine = status === "verified";

  const declare = () => {
    if (!word.trim()) return toast("Écris d'abord le mot que tu as trouvé");
    const n = parseInt(tries, 10);
    if (!Number.isInteger(n) || n < 1) return toast("Indique en combien d'essais tu as trouvé");
    found.mutate({ word, tries: n }, {
      onSuccess: (s) => {
        setWord("");
        setTries("");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (s.me_status === "pending") toast("Mot envoyé, il sera vérifié dès que la solution du jour est publiée");
        else if (!s.complete) toast("Bon mot, bien joué ! On attend l'autre pour le résultat");
        else toast(s.winner?.user_id === user?.id ? "Bon mot, et tu as gagné ! 👑" : "Bon mot, bien joué !");
      },
      onError: (e: Error) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast(e.message);
      },
    });
  };

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Cémantix" testID="cemantix-header" />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brandPrimary} />}
        >
          <Text style={styles.date}>{dayjs(data.date).format("dddd D MMMM")}</Text>
          <Text style={styles.number}>Cémantix n° {data.number}</Text>

          <View style={[styles.crownCard, winner && styles.crownCardWon]} testID="cemantix-crown">
            {winner ? (
              <>
                <Text style={styles.crown}>👑</Text>
                <Text style={styles.crownRole}>{crownTitle(winner.role)}</Text>
                <Text style={styles.crownName}>{winner.name}</Text>
                <Text style={styles.crownTime}>
                  {!data.complete
                    ? "pour l'instant : l'autre n'a pas encore répondu"
                    : data.tie
                      ? `à égalité (${winner.tries} essais), mais il a répondu le premier`
                      : `${winner.name} a battu ${loser?.name} : ${winner.tries} essais contre ${loser?.tries}`}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.crownEmpty}>Personne n'a encore trouvé…</Text>
                <Text style={styles.crownHint}>Celui qui trouve en le moins d'essais devient roi / reine du jour.</Text>
              </>
            )}
          </View>

          <SketchButton
            testID="cemantix-open-button"
            label="Ouvrir Cémantix"
            icon="external-link"
            variant="secondary"
            onPress={() => Linking.openURL(data.link)}
          />

          {verifiedMine ? (
            <View style={styles.doneRow} testID="cemantix-me-found">
              <Feather name="check-circle" size={20} color={colors.success} />
              <Text style={styles.doneText}>
                {!data.complete
                  ? "Mot vérifié ! On attend l'autre pour le résultat"
                  : iWon
                    ? "Tu as gagné aujourd'hui !"
                    : "Mot vérifié, l'autre a été plus fort aujourd'hui"}
              </Text>
            </View>
          ) : pendingMine ? (
            <View style={styles.doneRow} testID="cemantix-me-pending">
              <Feather name="clock" size={20} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.doneText}>Mot envoyé, en attente de vérification</Text>
                <Text style={styles.pendingHint}>
                  {data.solution_ready ? "Vérification en cours…" : "La solution du jour n'est pas encore publiée : on réessaie tout seuls."}
                </Text>
              </View>
              <Text style={styles.undo} testID="cemantix-undo" onPress={() => undo.mutate()} suppressHighlighting>
                Annuler
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                testID="cemantix-tries-input"
                style={styles.input}
                value={tries}
                onChangeText={(t) => setTries(t.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="Nombre d'essais pour y arriver"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <TextInput
                testID="cemantix-word-input"
                style={styles.input}
                value={word}
                onChangeText={setWord}
                placeholder="Le mot que tu as trouvé"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="send"
                onSubmitEditing={declare}
              />
              <SketchButton
                testID="cemantix-found-button"
                label="J'ai trouvé : vérifier"
                icon="flag"
                onPress={declare}
                loading={found.isPending}
              />
            </>
          )}

          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <View style={styles.card}>
            {data.scores.map((s) => {
              const claim = data.claims.find((c) => c.user_id === s.user_id);
              return (
                <View key={s.user_id} style={styles.row} testID={`cemantix-row-${s.user_id}`}>
                  <Text style={styles.rowName}>
                    {claim?.rank === 1 ? "👑 " : ""}
                    {s.name}
                  </Text>
                  <Text style={styles.rowStatus}>
                    {claim
                      ? data.complete && claim.tries
                        ? `a trouvé en ${claim.tries} essai${claim.tries > 1 ? "s" : ""}`
                        : `a trouvé à ${hour(claim.found_at)}`
                      : data.pending.some((p) => p.user_id === s.user_id)
                        ? "a envoyé un mot, à vérifier…"
                        : "cherche encore…"}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Couronnes gagnées</Text>
          <View style={styles.scoreRow}>
            {data.scores.map((s) => (
              <View key={s.user_id} style={styles.scoreCard} testID={`cemantix-score-${s.user_id}`}>
                <Text style={styles.scoreWins}>{s.wins}</Text>
                <Text style={styles.scoreName}>👑 {s.name}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footnote}>
            Le mot change chaque nuit à minuit. Tape le mot trouvé et ton nombre d'essais : le mot est comparé à la
            solution du jour d'Alucare. Le moins d'essais gagne ; si un seul a répondu, le point est pour lui.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  date: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, textTransform: "capitalize", textAlign: "center" },
  pendingHint: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  number: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center", marginTop: -10 },
  input: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: c.onSurface,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  crownCard: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  crownCardWon: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  crown: { fontSize: 54 },
  crownRole: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.muted },
  crownName: { fontFamily: fonts.hand, fontSize: 44, color: c.onSurface },
  crownTime: { fontFamily: fonts.body, fontSize: 15, color: c.onSurfaceSecondary },
  crownEmpty: { fontFamily: fonts.hand, fontSize: 30, color: c.onSurface, textAlign: "center" },
  crownHint: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 6 },
  doneText: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurface },
  undo: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textDecorationLine: "underline", padding: 6 },
  sectionTitle: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, marginTop: 4 },
  card: { borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary, padding: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, gap: 8 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurfaceSecondary },
  rowStatus: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  scoreRow: { flexDirection: "row", gap: 12 },
  scoreCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  scoreWins: { fontFamily: fonts.hand, fontSize: 42, color: c.brandPrimary },
  scoreName: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onSurfaceSecondary },
  footnote: { fontFamily: fonts.body, fontSize: 12, color: c.muted, textAlign: "center" },
}));
