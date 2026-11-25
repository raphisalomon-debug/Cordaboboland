// Rétrospective Cémantix : nombres d'essais jour par jour, qui a gagné, moyennes et records.
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Loading, ScreenHeader } from "@/src/components/ui";
import { useCemantixHistory } from "@/src/features/cemantix/api";
import { fonts, makeStyles, useTheme } from "@/src/theme";

dayjs.locale("fr");

export default function CemantixHistoryScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useCemantixHistory();
  const maxTries = Math.max(1, ...(data?.days ?? []).flatMap((d) => Object.values(d.tries).map((t) => t ?? 0)));
  const colorOf = (i: number) => (i === 0 ? colors.brandPrimary : colors.success);

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Rétrospective" testID="history-header" />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brandPrimary} />}
        >
          <View style={styles.statsRow}>
            {data.stats.map((s, i) => (
              <View key={s.user_id} style={[styles.statCard, { borderColor: colorOf(i) }]} testID={`history-stat-${s.user_id}`}>
                <Text style={styles.statName}>{s.name}</Text>
                <Text style={styles.statBig}>{s.avg ?? "—"}</Text>
                <Text style={styles.statLabel}>essais en moyenne</Text>
                <Text style={styles.statLine}>Record : {s.best ?? "—"} essai{(s.best ?? 0) > 1 ? "s" : ""}</Text>
                <Text style={styles.statLine}>👑 {s.wins} sur {s.played} jour{s.played > 1 ? "s" : ""}</Text>
              </View>
            ))}
          </View>

          {data.days.length === 0 && (
            <Text style={styles.empty} testID="history-empty">
              Pas encore de jour à comparer : il faut que vous ayez tous les deux trouvé le mot du jour.
            </Text>
          )}

          {data.days.map((d) => (
            <View key={d.date} style={styles.day} testID={`history-day-${d.date}`}>
              <View style={styles.dayHead}>
                <Text style={styles.dayDate}>{dayjs(d.date).format("ddd D MMMM")}</Text>
                <Text style={styles.dayNum}>n° {d.number}</Text>
              </View>
              {data.users.map((u, i) => {
                const t = d.tries[u.user_id];
                const answered = u.user_id in d.tries;
                const won = d.winner_id === u.user_id;
                return (
                  <View key={u.user_id} style={styles.barRow}>
                    <Text style={[styles.barName, won && styles.barNameWon]} numberOfLines={1}>
                      {won ? "👑 " : ""}
                      {u.name}
                    </Text>
                    <View style={styles.barTrack}>
                      {answered && t ? <View style={[styles.bar, { width: `${Math.max(6, (t / maxTries) * 100)}%`, backgroundColor: colorOf(i) }]} /> : null}
                    </View>
                    <Text style={styles.barVal}>{answered ? (t ?? "?") : "—"}</Text>
                  </View>
                );
              })}
              <Text style={styles.dayNote}>
                {!d.complete ? "Un seul a répondu : le point lui revient" : d.tie ? "Égalité, départagés par l'heure d'envoi" : ""}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 14, gap: 2, alignItems: "center", borderRadius: 16, borderWidth: 2, backgroundColor: c.surfaceSecondary },
  statName: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface },
  statBig: { fontFamily: fonts.hand, fontSize: 48, color: c.onSurface, lineHeight: 52 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: c.muted, marginBottom: 6 },
  statLine: { fontFamily: fonts.bodyBold, fontSize: 13, color: c.onSurfaceSecondary },
  empty: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center", padding: 24 },
  day: { padding: 14, gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  dayDate: { fontFamily: fonts.hand, fontSize: 24, color: c.onSurface, textTransform: "capitalize" },
  dayNum: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barName: { width: 78, fontFamily: fonts.body, fontSize: 14, color: c.onSurfaceSecondary },
  barNameWon: { fontFamily: fonts.bodyBold, color: c.onSurface },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: c.surface, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 7 },
  barVal: { width: 34, textAlign: "right", fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurface },
  dayNote: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
}));
