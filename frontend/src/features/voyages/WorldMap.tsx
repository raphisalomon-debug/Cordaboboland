// Carte du monde : pays noirs / à la liste d'envies (hachurés) / visités (couleur), épingles de souvenirs,
// trait pointillé vers le prochain voyage, décor dessiné. Zoom : boutons, pincement, molette ; glisser pour se déplacer.
import { Feather } from "@react-native-vector-icons/feather";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Platform, Pressable, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from "react-native-svg";

import { Entry, Overview } from "@/src/features/voyages/api";
import { arcPath, COUNTRY_BY_CODE, Country, sharedWishes } from "@/src/features/voyages/geo";
import { COUNTRIES, WAVES, WORLD_H, WORLD_W } from "@/src/features/voyages/world";
import { makeStyles, useNightMode, useTheme } from "@/src/theme";

type V = { scale: number; cx: number; cy: number };
const MAX_SCALE = 20;
const INK = "#5A4A3C";
// Le petit voilier navigue sur la vague d'océan la plus proche du milieu de l'Atlantique.
const BOAT_AT = WAVES.reduce((best, w) => (Math.hypot(w[0] - 410, w[1] - 185) < Math.hypot(best[0] - 410, best[1] - 185) ? w : best), WAVES[0]);

export function WorldMap({
  overview,
  height,
  selectedCode,
  onPickCountry,
  onPickPin,
  focusCode,
  focusScale = 6,
  placing,
  onPlace,
  placed,
  testID = "voyages-map",
}: {
  overview: Overview;
  height: number;
  selectedCode?: string | null;
  onPickCountry?: (c: Country) => void;
  onPickPin?: (e: Entry) => void;
  focusCode?: string;
  focusScale?: number;
  placing?: boolean; // on touche la carte pour poser une épingle (les pays ne réagissent plus)
  onPlace?: (x: number, y: number) => void;
  placed?: { x: number; y: number } | null;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { isNight } = useNightMode();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<V>({ scale: 1, cx: WORLD_W / 2, cy: WORLD_H / 2 });
  const noir = isNight ? "#0E0D0C" : "#2B2824";
  const sea = isNight ? "#2A2724" : colors.surfaceSecondary;

  const visited = useMemo(() => new Map(overview.visited.map((v) => [v.code, v.color])), [overview.visited]);
  const wishCodes = useMemo(() => new Set(overview.wishes.map((w) => w.code)), [overview.wishes]);
  const both = useMemo(() => new Set(sharedWishes(overview)), [overview]);
  const arc = overview.trip ? arcPath(overview.trip.code) : null;

  // --- vue (viewBox) -----------------------------------------------------
  const vw = WORLD_W / view.scale;
  const vh = box.w ? (vw * box.h) / box.w : WORLD_H / view.scale;
  const unitsPerPx = box.w ? vw / box.w : 1;
  const clampView = (v: V, b = box): V => {
    const w = WORLD_W / v.scale;
    const h = b.w ? (w * b.h) / b.w : WORLD_H / v.scale;
    return {
      scale: v.scale,
      cx: w >= WORLD_W ? WORLD_W / 2 : Math.max(w / 2, Math.min(WORLD_W - w / 2, v.cx)),
      cy: h >= WORLD_H ? WORLD_H / 2 : Math.max(h / 2, Math.min(WORLD_H - h / 2, v.cy)),
    };
  };
  const ref = useRef({ view, box, clampView });
  ref.current = { view, box, clampView };
  const zoomBy = (f: number) => setView((v) => clampView({ ...v, scale: Math.max(1, Math.min(MAX_SCALE, v.scale * f)) }));

  // centrer sur un pays (fiche, pose d'épingle)
  useEffect(() => {
    const c = focusCode ? COUNTRY_BY_CODE.get(focusCode)?.c : null;
    if (c && box.w) setView(clampView({ scale: focusScale, cx: c[0], cy: c[1] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCode, box.w, box.h]);

  // --- gestes -------------------------------------------------------------
  const gesture = useRef<{ start: V; dist: number }>({ start: view, dist: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          gesture.current = { start: ref.current.view, dist: 0 };
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (e, g) => {
          const { box: b, clampView: clamp } = ref.current;
          if (!b.w) return;
          const t = e.nativeEvent.touches;
          const st = gesture.current.start;
          if (t && t.length >= 2) {
            const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
            if (!gesture.current.dist) gesture.current = { start: ref.current.view, dist: d };
            const s = Math.max(1, Math.min(MAX_SCALE, gesture.current.start.scale * (d / gesture.current.dist)));
            setView(clamp({ ...gesture.current.start, scale: s }));
            return;
          }
          if (gesture.current.dist) return;
          const upp = WORLD_W / st.scale / b.w;
          setView(clamp({ scale: st.scale, cx: st.cx - g.dx * upp, cy: st.cy - g.dy * upp }));
        },
      }),
    [],
  );

  const mapRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = mapRef.current as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.25 : 0.8;
      setView((v) => ref.current.clampView({ ...v, scale: Math.max(1, Math.min(MAX_SCALE, v.scale * f)) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const lastTouch = useRef({ x: NaN, y: NaN });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const stroke = Math.max(0.2, 1.1 / Math.sqrt(view.scale));
  const px = unitsPerPx; // taille d'un pixel d'écran dans le repère de la carte
  const showWaves = view.scale < 4;

  return (
    <View ref={mapRef} style={[styles.card, { height, backgroundColor: sea }]} onLayout={onLayout} {...responder.panHandlers} testID={testID}>
      {box.w > 0 && (
        <Svg width={box.w} height={box.h} viewBox={`${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`}>
          <Defs>
            <Pattern id="wish" patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
              <Rect width={7} height={7} fill={isNight ? "#1B1917" : "#3A342E"} />
              <Rect width={3} height={7} fill="#E9C46A" opacity={0.85} />
            </Pattern>
            <Pattern id="wishboth" patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
              <Rect width={7} height={7} fill={isNight ? "#1B1917" : "#3A342E"} />
              <Rect width={3} height={7} fill="#EDA1BD" opacity={0.95} />
            </Pattern>
          </Defs>

          {/* décor : vagues dessinées sur les océans */}
          {showWaves &&
            WAVES.map(([x, y, s], i) => (
              <Path key={i} d={`M${x} ${y} q${3 * s} ${-2.6 * s} ${6 * s} 0 t${6 * s} 0`} stroke={isNight ? "#4A5C6A" : "#A9C8E4"} strokeWidth={1.1} fill="none" strokeLinecap="round" />
            ))}

          {COUNTRIES.map((c) => {
            const v = visited.get(c.code);
            const fill = v ?? (both.has(c.code) ? "url(#wishboth)" : wishCodes.has(c.code) ? "url(#wish)" : noir);
            const sel = selectedCode === c.code;
            return (
              <Path
                key={c.code}
                d={c.d}
                fill={fill}
                stroke={sel ? colors.brandPrimary : sea}
                strokeWidth={sel ? stroke * 2.2 : stroke}
                strokeLinejoin="round"
                onPress={placing ? undefined : () => onPickCountry?.(c)}
              />
            );
          })}

          {/* décor : rose des vents et petit voilier */}
          <G x={64} y={WORLD_H - 62} opacity={isNight ? 0.7 : 0.9}>
            <Circle r={26} fill="none" stroke={isNight ? "#7A6C5C" : INK} strokeWidth={1.2} strokeDasharray="2 3" />
            <Path d="M0 -24 L5 0 L0 24 L-5 0 Z" fill={isNight ? "#7A6C5C" : INK} />
            <Path d="M-24 0 L0 -5 L24 0 L0 5 Z" fill={sea} stroke={isNight ? "#7A6C5C" : INK} strokeWidth={1.2} />
            <Path d="M0 -24 L5 0 L-5 0 Z" fill="#E26D6D" />
          </G>
          <G x={BOAT_AT[0]} y={BOAT_AT[1]}>
            <Path d="M0 0 L0 -16 M1.5 -15 Q11 -7 12 0 L1.5 0 Z M-1.5 -12 Q-8 -6 -11 0 L-1.5 0 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
            <Path d="M-13 1.5 Q0 4 14 1.5 Q11 8 5 9 L-6 9 Q-11 7 -13 1.5 Z" fill="#B58B5E" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
          </G>

          {/* prochain voyage : trait pointillé depuis la Suisse + avion de papier */}
          {arc && (
            <G>
              <Path d={arc.d} stroke="#E26D6D" strokeWidth={Math.max(1, 2 * px)} strokeDasharray={`${6 * px} ${6 * px}`} fill="none" strokeLinecap="round" />
              <G x={arc.mid[0]} y={arc.mid[1]} scale={px * 1.4}>
                <Path d="M-8 4 L9 -2 L-4 -3 Z M-4 -3 L-2 5 L1 0 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
              </G>
            </G>
          )}

          {/* épingles de souvenirs (taille constante à l'écran) */}
          {overview.pins.map((p) =>
            p.pin ? (
              <G key={p.id} x={p.pin.x} y={p.pin.y} scale={px * 0.95} onPress={placing ? undefined : () => onPickPin?.(p)}>
                <Path d="M0 0 C-14 -14 -11 -26 0 -21 C11 -26 14 -14 0 0 Z" fill="#E26D6D" stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
              </G>
            ) : null,
          )}
          {placed && (
            <G x={placed.x} y={placed.y} scale={px * 1.5}>
              <Path d="M0 0 C-14 -14 -11 -26 0 -21 C11 -26 14 -14 0 0 Z" fill="#E9C46A" stroke="#2B2824" strokeWidth={2} strokeLinejoin="round" />
            </G>
          )}
        </Svg>
      )}

      {placing && (
        <Pressable
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
          testID="map-place-overlay"
          onPressIn={(e) => {
            lastTouch.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          }}
          onPress={() => {
            const { x, y } = lastTouch.current;
            const { view: v, box: b } = ref.current;
            if (!Number.isFinite(x) || !Number.isFinite(y) || !b.w) return;
            const w = WORLD_W / v.scale;
            const h = (w * b.h) / b.w;
            onPlace?.(v.cx - w / 2 + (x / b.w) * w, v.cy - h / 2 + (y / b.h) * h);
          }}
        />
      )}

      <View style={styles.zoom}>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.6)} testID={`${testID}-zoom-in`} hitSlop={6}>
          <Feather name="plus" size={20} color={colors.onSurface} />
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 1.6)} testID={`${testID}-zoom-out`} hitSlop={6}>
          <Feather name="minus" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { borderWidth: 1.5, borderColor: c.borderStrong, borderRadius: 16, overflow: "hidden" },
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
}));
