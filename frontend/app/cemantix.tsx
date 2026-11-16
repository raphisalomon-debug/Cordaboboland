// Cémantix : course quotidienne. Le premier à trouver le mot du jour est roi / reine du jour.
import { Feather } from "@react-native-vector-icons/feather";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import * as Haptics from "expo-haptics";
import { Linking, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
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

  const declare = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    found.mutate(undefined, {
      onSuccess: (s) => toast(s.winner?.user_id === user?.id ? "Tu es le premier ! 👑" : "Bien joué, tu as trouvé !"),
      onError: (e: Error) => toast(e.message),
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

          <View style={[styles.crownCard, winner && styles.crownCardWon]} testID="cemantix-crown">
            {winner ? (
              <>
                <Text style={styles.crown}>👑</Text>
                <Text style={styles.crownRole}>{crownTitle(winner.role)}</Text>
                <Text style={styles.crownName}>{winner.name}</Text>
                <Text style={styles.crownTime}>a trouvé à {hour(winner.found_at)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.crownEmpty}>Personne n'a encore trouvé…</Text>
                <Text style={styles.crownHint}>Le premier à trouver le mot devient roi / reine du jour.</Text>
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

          {data.me_found ? (
            <View style={styles.doneRow} testID="cemantix-me-found">
              <Feather name="check-circle" size={20} color={colors.success} />
              <Text style={styles.doneText}>
                {iWon ? "Tu as gagné aujourd'hui !" : `Tu as trouvé à ${hour(myClaim!.found_at)}`}
              </Text>
              <Text style={styles.undo} testID="cemantix-undo" onPress={() => undo.mutate()} suppressHighlighting>
                Annuler
              </Text>
            </View>
          ) : (
            <SketchButton
              testID="cemantix-found-button"
              label="J'ai trouvé le mot !"
              icon="flag"
              onPress={declare}
              loading={found.isPending}
            />
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
                    {claim ? `a trouvé à ${hour(claim.found_at)}` : "cherche encore…"}
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
            Le mot change chaque nuit à minuit. Appuie sur « J'ai trouvé » dès que tu as la réponse : c'est l'heure
            enregistrée qui compte.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  date: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, textTransform: "capitalize", textAlign: "center" },
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
