// Nos voyages : la carte du monde. Pays noir = pas encore pensé, hachuré = on veut y aller, couleur = visité.
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { IconButton, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { VISIT_COLORS, useOverview, useVoyageActions } from "@/src/features/voyages/api";
import { COUNTRY_BY_CODE, Country, daysUntil, flag, frDate, nameOf, normalize, sharedWishes, worldStats } from "@/src/features/voyages/geo";
import { WorldMap } from "@/src/features/voyages/WorldMap";
import { COUNTRIES } from "@/src/features/voyages/world";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function VoyagesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data: overview, isLoading } = useOverview();

  const [selected, setSelected] = useState<Country | null>(null);
  const [query, setQuery] = useState("");
  const actions = useVoyageActions(selected?.code);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return q ? COUNTRIES.filter((c) => normalize(c.name).includes(q)).slice(0, 6) : [];
  }, [query]);

  const open = (code: string) => {
    setSelected(null);
    router.push({ pathname: "/voyages/pays", params: { code } });
  };

  if (isLoading || !overview) {
    return (
      <View style={styles.root}>
        <Paper />
        <ScreenHeader title="Nos voyages" testID="voyages-header" />
        <Loading />
      </View>
    );
  }

  const stats = worldStats(overview);
  const sharedSet = new Set(sharedWishes(overview));
  const visitedSet = new Map(overview.visited.map((v) => [v.code, v]));
  const mine = new Set(overview.wishes.filter((w) => w.user_id === user?.id).map((w) => w.code));
  const trip = overview.trip;
  const left = trip ? daysUntil(trip.date) : null;

  const sel = selected?.code;
  const selVisit = sel ? visitedSet.get(sel) : undefined;
  const selWished = sel ? mine.has(sel) : false;
  const err = (e: Error) => toast(e.message);

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader
        title="Nos voyages"
        testID="voyages-header"
        right={<IconButton icon="book-open" testID="voyages-passport-button" onPress={() => router.push("/voyages/passeport")} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={styles.stats} testID="voyages-stats">
          <View style={styles.stat}>
            <Text style={styles.statNum} testID="voyages-count">{stats.countries}</Text>
            <Text style={styles.statLabel}>{stats.countries > 1 ? "pays visités" : "pays visité"}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.continents}</Text>
            <Text style={styles.statLabel}>{stats.continents > 1 ? "continents" : "continent"}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.percent}%</Text>
            <Text style={styles.statLabel}>du monde</Text>
          </View>
        </View>

        {trip && (
          <Pressable style={styles.trip} onPress={() => open(trip.code)} testID="voyages-trip">
            <Text style={styles.tripEmoji}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>
                {trip.title || "Prochain voyage"} · {flag(trip.code)} {nameOf(trip.code)}
              </Text>
              <Text style={styles.tripSub}>
                {left === null ? "Date à fixer" : left > 1 ? `Dans ${left} jours · ${frDate(trip.date)}` : left === 1 ? "Demain !" : left === 0 ? "C'est aujourd'hui !" : `Parti il y a ${-left} jours`}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        )}

        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            testID="voyages-search"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Chercher un pays"
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {results.length > 0 && (
          <View style={styles.results}>
            {results.map((c) => (
              <Pressable key={c.code} style={styles.result} onPress={() => { setSelected(c); setQuery(""); }} testID={`voyages-result-${c.code}`}>
                <Text style={styles.resultText}>{flag(c.code)}  {c.name}</Text>
                {visitedSet.has(c.code) && <View style={[styles.dot, { backgroundColor: visitedSet.get(c.code)!.color }]} />}
              </Pressable>
            ))}
          </View>
        )}

        <WorldMap
          overview={overview}
          height={300}
          selectedCode={sel}
          onPickCountry={setSelected}
          onPickPin={(e) => open(e.code)}
        />
        <View style={styles.legend}>
          <Legend color="#2B2824" label="Pas encore" />
          <Legend color="#E9C46A" label="On veut y aller" striped />
          <Legend color="#E8826B" label="Visité" />
          <Legend color="#E26D6D" label="Souvenir" heart />
        </View>

        <View style={styles.actions}>
          <SketchButton testID="voyages-wheel" label="On part où ?" icon="refresh-cw" variant="secondary" onPress={() => router.push("/voyages/roue")} style={{ flex: 1 }} />
          <SketchButton testID="voyages-passport" label="Notre passeport" icon="book-open" variant="secondary" onPress={() => router.push("/voyages/passeport")} style={{ flex: 1 }} />
        </View>

        <Text style={styles.section}>Nos envies</Text>
        {stats.wished.length === 0 ? (
          <Text style={styles.hint}>Appuie sur un pays puis « On a envie d'y aller » pour remplir la liste.</Text>
        ) : (
          <View style={styles.chips}>
            {stats.wished.map((code) => (
              <Pressable key={code} style={styles.chip} onPress={() => open(code)} testID={`voyages-wish-${code}`}>
                <Text style={styles.chipText}>
                  {flag(code)} {nameOf(code)}
                  {sharedSet.has(code) ? " ✨" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={styles.hint}>Pince ou utilise + / − pour zoomer, glisse pour te déplacer. ✨ = vous le voulez tous les deux.</Text>
      </ScrollView>

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected ? `${flag(selected.code)} ${selected.name}` : ""} testID="voyages-sheet">
        {selected && (
          <View style={{ gap: 12 }}>
            <Text style={styles.status}>
              {selVisit ? "On y est allé 🎉" : selWished ? "Tu as envie d'y aller 💭" : "Pas encore sur la carte"}
            </Text>
            {selVisit ? (
              <>
                <Text style={styles.label}>Couleur sur la carte</Text>
                <View style={styles.swatches}>
                  {VISIT_COLORS.map((col) => (
                    <Pressable
                      key={col}
                      testID={`voyages-color-${col.slice(1)}`}
                      onPress={() => actions.setVisit.mutate({ color: col, visited_on: selVisit.visited_on }, { onError: err })}
                      style={[styles.swatch, { backgroundColor: col }, selVisit.color === col && styles.swatchOn]}
                    >
                      {selVisit.color === col && <Feather name="check" size={18} color="#2B2824" />}
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <SketchButton
                  testID="voyages-visit"
                  label="On y est allé !"
                  icon="map-pin"
                  onPress={() => actions.setVisit.mutate({ color: VISIT_COLORS[0] }, { onError: err })}
                  loading={actions.setVisit.isPending}
                />
                <SketchButton
                  testID="voyages-wish"
                  label={selWished ? "Retirer mon envie" : "On a envie d'y aller"}
                  icon="heart"
                  variant="secondary"
                  onPress={() => (selWished ? actions.clearWish.mutate(undefined, { onError: err }) : actions.setWish.mutate("", { onError: err }))}
                  loading={actions.setWish.isPending || actions.clearWish.isPending}
                />
              </>
            )}
            <SketchButton testID="voyages-open" label="Ouvrir la fiche (souvenirs, idées…)" icon="book" onPress={() => open(selected.code)} />
            {selVisit && (
              <Text style={styles.link} onPress={() => actions.clearVisit.mutate(undefined, { onError: err })} testID="voyages-unvisit" suppressHighlighting>
                Finalement, pas encore allé
              </Text>
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}

function Legend({ color, label, striped, heart }: { color: string; label: string; striped?: boolean; heart?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      {heart ? (
        <Text style={{ fontSize: 12, color }}>♥</Text>
      ) : (
        <View style={[styles.legendBox, { backgroundColor: striped ? "#3A342E" : color, borderColor: striped ? color : "transparent", borderWidth: striped ? 2 : 0 }]} />
      )}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  statNum: { fontFamily: fonts.hand, fontSize: 32, color: c.onSurface },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  trip: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "#E26D6D", backgroundColor: c.surfaceSecondary },
  tripEmoji: { fontSize: 26 },
  tripTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurface },
  tripSub: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surfaceSecondary, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.onSurface, paddingVertical: 11 },
  results: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surfaceSecondary, padding: 4 },
  result: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10 },
  resultText: { fontFamily: fonts.body, fontSize: 16, color: c.onSurface },
  dot: { width: 14, height: 14, borderRadius: 7 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  actions: { flexDirection: "row", gap: 10 },
  section: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onSurface },
  hint: { fontFamily: fonts.body, fontSize: 12, color: c.muted, textAlign: "center" },
  status: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurfaceSecondary },
  label: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  swatchOn: { borderWidth: 3, borderColor: c.onSurface },
  link: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textDecorationLine: "underline", textAlign: "center", padding: 4 },
}));
