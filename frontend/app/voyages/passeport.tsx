// Passeport : un tampon par pays visité, avec les stats et les trophées du voyage.
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Loading, ScreenHeader } from "@/src/components/ui";
import { TravelTrophies } from "@/src/features/voyages/TravelTrophies";
import { useOverview } from "@/src/features/voyages/api";
import { flag, frDate, nameOf, worldStats } from "@/src/features/voyages/geo";
import { fonts, makeStyles } from "@/src/theme";

export default function PasseportScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data } = useOverview();
  const stats = data ? worldStats(data) : null;
  const stamps = [...(data?.visited ?? [])].sort((a, b) => (a.visited_on || "9").localeCompare(b.visited_on || "9"));

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Notre passeport" testID="passeport-header" />
      {!data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
          {stats && (
            <Text style={styles.stats} testID="passeport-stats">
              {stats.countries} pays · {stats.continents} continents · {stats.percent}% du monde
            </Text>
          )}
          {stamps.length === 0 && <Text style={styles.empty}>Pas encore de tampon. Marque un pays comme visité !</Text>}
          <View style={styles.grid}>
            {stamps.map((v, i) => (
              <Pressable
                key={v.code}
                testID={`stamp-${v.code}`}
                onPress={() => router.push({ pathname: "/voyages/pays", params: { code: v.code } })}
                style={[styles.stamp, { borderColor: v.color, transform: [{ rotate: `${((i * 7) % 11) - 5}deg` }] }]}
              >
                <Text style={styles.flag}>{flag(v.code)}</Text>
                <Text style={[styles.name, { color: v.color }]} numberOfLines={2}>{nameOf(v.code)}</Text>
                <Text style={[styles.date, { color: v.color }]}>{frDate(v.visited_on) || "—"}</Text>
              </Pressable>
            ))}
          </View>
          <TravelTrophies overview={data} />
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  stats: { fontFamily: fonts.hand, fontSize: 24, color: c.onSurface, textAlign: "center" },
  empty: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" },
  stamp: { width: "46%", padding: 10, borderWidth: 3, borderStyle: "dashed", borderRadius: 14, alignItems: "center", gap: 2, backgroundColor: c.surfaceSecondary },
  flag: { fontSize: 34 },
  name: { fontFamily: fonts.hand, fontSize: 22, textAlign: "center" },
  date: { fontFamily: fonts.bodyBold, fontSize: 12 },
}));
