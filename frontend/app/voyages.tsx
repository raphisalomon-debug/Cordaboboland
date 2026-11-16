// Nos voyages : carte du monde. Pays noir = pas encore visité ; on appuie sur un pays pour dire qu'on y est allé
// et choisir sa couleur. Zoom : boutons +/−, pincement, molette ; déplacement : glisser.
import { Feather } from "@react-native-vector-icons/feather";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { VISIT_COLORS, useVisited, useVisitedActions } from "@/src/features/voyages/api";
import { COUNTRIES, WORLD_H, WORLD_W } from "@/src/features/voyages/world";
import { fonts, makeStyles, useNightMode, useTheme } from "@/src/theme";

type Country = (typeof COUNTRIES)[number];
type View2 = { scale: number; cx: number; cy: number }; // centre de la vue (repère de la carte) + zoom

const MAX_SCALE = 14;
const flat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function VoyagesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { isNight } = useNightMode();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: visited, isLoading } = useVisited();
  const { set, unset } = useVisitedActions();

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View2>({ scale: 1, cx: WORLD_W / 2, cy: WORLD_H / 2 });
  const [selected, setSelected] = useState<Country | null>(null);
  const [query, setQuery] = useState("");

  const colorOf = useMemo(() => new Map((visited ?? []).map((v) => [v.code, v.color])), [visited]);
  const noir = isNight ? "#0E0D0C" : "#2B2824";

  // --- vue (viewBox) -------------------------------------------------------
  const vw = WORLD_W / view.scale;
  const vh = box.w ? (vw * box.h) / box.w : WORLD_H / view.scale;
  const clampView = (v: View2): View2 => {
    const w = WORLD_W / v.scale;
    const h = box.w ? (w * box.h) / box.w : WORLD_H / v.scale;
    const cx = w >= WORLD_W ? WORLD_W / 2 : Math.max(w / 2, Math.min(WORLD_W - w / 2, v.cx));
    const cy = h >= WORLD_H ? WORLD_H / 2 : Math.max(h / 2, Math.min(WORLD_H - h / 2, v.cy));
    return { scale: v.scale, cx, cy };
  };
  const viewRef = useRef(view);
  viewRef.current = view;
  const boxRef = useRef(box);
  boxRef.current = box;
  const clampRef = useRef(clampView);
  clampRef.current = clampView;

  const zoomBy = (f: number) =>
    setView((v) => clampView({ ...v, scale: Math.max(1, Math.min(MAX_SCALE, v.scale * f)) }));

  // --- gestes : glisser + pincer -------------------------------------------
  const gesture = useRef({ start: view, dist: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          gesture.current = { start: viewRef.current, dist: 0 };
        },
        onPanResponderMove: (e, g) => {
          const b = boxRef.current;
          if (!b.w) return;
          const t = e.nativeEvent.touches;
          const st = gesture.current.start;
          if (t && t.length >= 2) {
            const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
            if (!gesture.current.dist) gesture.current = { start: viewRef.current, dist: d };
            const ratio = d / gesture.current.dist;
            const s = Math.max(1, Math.min(MAX_SCALE, gesture.current.start.scale * ratio));
            setView(clampRef.current({ ...gesture.current.start, scale: s }));
            return;
          }
          if (gesture.current.dist) return; // fin d'un pincement : on ignore le doigt restant
          const unitsPerPx = WORLD_W / st.scale / b.w;
          setView(clampRef.current({ scale: st.scale, cx: st.cx - g.dx * unitsPerPx, cy: st.cy - g.dy * unitsPerPx }));
        },
      }),
    [],
  );

  const mapRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = mapRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.25 : 0.8;
      setView((v) => clampRef.current({ ...v, scale: Math.max(1, Math.min(MAX_SCALE, v.scale * f)) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isLoading]);

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  // --- actions ---------------------------------------------------------------
  const pick = (c: Country) => {
    setSelected(c);
    setQuery("");
  };
  const chooseColor = (c: Country, color: string) =>
    set.mutate({ code: c.code, color }, { onError: (e: Error) => toast(e.message) });
  const remove = (c: Country) => unset.mutate(c.code, { onError: (e: Error) => toast(e.message) });

  const results = useMemo(() => {
    const q = flat(query.trim());
    if (!q) return [];
    return COUNTRIES.filter((c) => flat(c.name).includes(q)).slice(0, 6);
  }, [query]);

  const sel = selected ? colorOf.get(selected.code) : undefined;
  const count = visited?.length ?? 0;
  const mapHeight = Math.max(210, Math.min(460, box.w ? box.w * 0.52 : 220));
  const stroke = Math.max(0.25, 1.1 / Math.sqrt(view.scale));

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Nos voyages" testID="voyages-header" />
      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.count} testID="voyages-count">
            {count === 0 ? "Aucun pays visité pour l'instant" : count === 1 ? "1 pays visité" : `${count} pays visités`}
          </Text>

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
                <Pressable key={c.code} style={styles.result} onPress={() => pick(c)} testID={`voyages-result-${c.code}`}>
                  <Text style={styles.resultText}>{c.name}</Text>
                  {colorOf.has(c.code) && <View style={[styles.dot, { backgroundColor: colorOf.get(c.code) }]} />}
                </Pressable>
              ))}
            </View>
          )}

          <View
            ref={mapRef}
            style={[styles.mapCard, { height: mapHeight }]}
            onLayout={onLayout}
            {...responder.panHandlers}
            testID="voyages-map"
          >
            {box.w > 0 && (
              <Svg
                width={box.w}
                height={box.h}
                viewBox={`${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`}
              >
                {COUNTRIES.map((c) => {
                  const color = colorOf.get(c.code);
                  const isSel = selected?.code === c.code;
                  return (
                    <Path
                      key={c.code}
                      d={c.d}
                      fill={color ?? noir}
                      stroke={isSel ? colors.brandPrimary : colors.surfaceSecondary}
                      strokeWidth={isSel ? stroke * 2.2 : stroke}
                      strokeLinejoin="round"
                      onPress={() => pick(c)}
                    />
                  );
                })}
              </Svg>
            )}
            <View style={styles.zoom}>
              <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.6)} testID="voyages-zoom-in" hitSlop={6}>
                <Feather name="plus" size={20} color={colors.onSurface} />
              </Pressable>
              <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 1.6)} testID="voyages-zoom-out" hitSlop={6}>
                <Feather name="minus" size={20} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.hint}>
            Appuie sur un pays pour dire qu'on y est allé. Pince ou utilise + / − pour zoomer, glisse pour te déplacer.
          </Text>
        </ScrollView>
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} testID="voyages-sheet">
        {selected && (
          <View style={{ gap: 14 }}>
            <Text style={styles.status}>{sel ? "On y est allé 🎉" : "On n'y est pas encore allé"}</Text>
            {sel ? (
              <>
                <Text style={styles.label}>Couleur sur la carte</Text>
                <View style={styles.swatches}>
                  {VISIT_COLORS.map((col) => (
                    <Pressable
                      key={col}
                      testID={`voyages-color-${col.slice(1)}`}
                      onPress={() => chooseColor(selected, col)}
                      style={[styles.swatch, { backgroundColor: col }, sel === col && styles.swatchOn]}
                    >
                      {sel === col && <Feather name="check" size={18} color="#2B2824" />}
                    </Pressable>
                  ))}
                </View>
                <SketchButton
                  testID="voyages-unvisit"
                  label="Finalement, pas encore allé"
                  variant="ghost"
                  onPress={() => remove(selected)}
                  loading={unset.isPending}
                />
              </>
            ) : (
              <SketchButton
                testID="voyages-visit"
                label="On y est allé !"
                icon="map-pin"
                onPress={() => chooseColor(selected, VISIT_COLORS[0])}
                loading={set.isPending}
              />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  count: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface, textAlign: "center" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: 14,
  },
  search: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.onSurface, paddingVertical: 11 },
  results: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surfaceSecondary, padding: 4 },
  result: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10 },
  resultText: { fontFamily: fonts.body, fontSize: 16, color: c.onSurface },
  dot: { width: 14, height: 14, borderRadius: 7 },
  mapCard: {
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    overflow: "hidden",
  },
  zoom: { position: "absolute", right: 10, bottom: 10, gap: 8 },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: c.muted, textAlign: "center" },
  status: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurfaceSecondary },
  label: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchOn: { borderWidth: 3, borderColor: c.onSurface },
}));
