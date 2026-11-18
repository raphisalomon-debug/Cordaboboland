// Nos trophées : étagères en bois avec les objectifs accomplis.
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Loading, ScreenHeader } from "@/src/components/ui";
import { TravelTrophies } from "@/src/features/voyages/TravelTrophies";
import { useOverview } from "@/src/features/voyages/api";
import { GoalsTabs } from "@/src/features/goals/GoalsTabs";
import { useTrophies } from "@/src/features/goals/api";
import { TrophyIcon } from "@/src/features/goals/TrophyIcon";
import { fonts, makeStyles, useTheme } from "@/src/theme";

dayjs.locale("fr");
const PER_SHELF = 3;

export default function TropheesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useTrophies();
  const { data: travel } = useOverview();
  const items = data ?? [];
  const shelves: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += PER_SHELF) shelves.push(items.slice(i, i + PER_SHELF));
  if (shelves.length === 0) shelves.push([]);

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Objectifs et trophées" testID="trophies-header" />
      <GoalsTabs current="trophees" />
      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 28, paddingTop: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          {items.length === 0 && (
            <Text style={styles.emptyText} testID="trophies-empty">
              Accomplissez un objectif pour gagner votre premier trophée !
            </Text>
          )}
          {shelves.map((row, i) => (
            <View key={i} testID={`shelf-${i}`}>
              <View style={styles.row}>
                {row.map((g) => (
                  <View key={g.id} style={styles.trophy} testID={`trophy-${g.id}`}>
                    <TrophyIcon trophy={g.trophy} size={64} />
                    <Text style={styles.name} numberOfLines={2}>
                      {g.title}
                    </Text>
                    <Text style={styles.date}>{dayjs(g.completed_at).format("D MMM YYYY")}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.plank} />
              <View style={styles.plankEdge} />
              <View style={styles.brackets}>
                <View style={styles.bracket} />
                <View style={styles.bracket} />
              </View>
            </View>
          ))}
          {travel && <TravelTrophies overview={travel} />}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  row: { flexDirection: "row", minHeight: 130, alignItems: "flex-end", paddingHorizontal: 4 },
  trophy: { width: `${100 / PER_SHELF}%`, alignItems: "center", gap: 2, paddingHorizontal: 4, paddingBottom: 4, overflow: "hidden" },
  name: { fontFamily: fonts.hand, fontSize: 18, lineHeight: 19, color: c.onSurface, textAlign: "center" },
  date: { fontFamily: fonts.body, fontSize: 11, color: c.muted },
  plank: { height: 14, backgroundColor: c.wood, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: c.woodDark },
  plankEdge: { height: 6, backgroundColor: c.woodDark, marginHorizontal: 2, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  brackets: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 28 },
  bracket: { width: 10, height: 16, backgroundColor: c.woodDark, borderBottomLeftRadius: 8, borderBottomRightRadius: 2 },
  emptyText: { fontFamily: fonts.hand, fontSize: 24, color: c.muted, textAlign: "center", paddingHorizontal: 24 },
}));
