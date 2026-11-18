// Trophées du voyage : gagnés automatiquement selon la carte (pays, continents, envies, souvenirs).
import { Text, View } from "react-native";

import { Overview } from "@/src/features/voyages/api";
import { achievements } from "@/src/features/voyages/geo";
import { fonts, makeStyles } from "@/src/theme";

export function TravelTrophies({ overview }: { overview: Overview }) {
  const styles = useStyles();
  const list = achievements(overview);
  const done = list.filter((a) => a.value >= a.goal).length;
  return (
    <View style={{ gap: 10 }} testID="travel-trophies">
      <Text style={styles.title}>Trophées du voyage · {done}/{list.length}</Text>
      {list.map((a) => {
        const ok = a.value >= a.goal;
        return (
          <View key={a.key} style={[styles.row, !ok && { opacity: 0.55 }]} testID={`travel-trophy-${a.key}`}>
            <Text style={[styles.emoji, !ok && { opacity: 0.4 }]}>{ok ? a.emoji : "🔒"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.title}</Text>
              <Text style={styles.desc}>{ok ? a.desc : `${a.desc} · ${Math.min(a.value, a.goal)}/${a.goal}`}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  title: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  emoji: { fontSize: 28 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurface },
  desc: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
}));
