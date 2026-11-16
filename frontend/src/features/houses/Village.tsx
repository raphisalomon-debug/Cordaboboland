// The village: houses placed on the sheet, little paths between them,
// street lamps along the paths (lit at night). In `editable` mode each
// house can be dragged with the finger.
import { useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { BOAT_KEY } from "@/src/features/houses/layout";
import { StreetLamp } from "@/src/components/StreetLamp";
import { House } from "@/src/features/houses/api";
import { HouseImage } from "@/src/features/houses/HouseImage";
import { Nature } from "@/src/features/houses/Nature";
import { Garland, showGarlands } from "@/src/features/houses/Garland";
import { useSeason } from "@/src/features/houses/season";
import { fonts, makeStyles, useNightMode, useTheme } from "@/src/theme";

type Props = {
  houses: House[]; // already filtered (visible only, or all in edit mode)
  editable?: boolean;
  badges?: Record<string, number>;
  onPressHouse?: (h: House) => void;
  onMove?: (key: string, x: number, y: number) => void;
};

type Pt = { x: number; y: number };

export function Village({ houses, editable, badges = {}, onPressHouse, onMove }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { isNight } = useNightMode();
  const { colors } = useTheme();
  const houseSize = Math.min(size.w * 0.3, 118, size.h * 0.17);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // Path segments (quadratic curves) + lamp positions between consecutive houses.
  const { paths, lamps, pathPts, housePts } = useMemo(() => {
    const sorted = houses.filter((h) => h.key !== BOAT_KEY).sort((a, b) => a.order - b.order);
    const pts: Pt[] = sorted.map((h) => ({ x: h.x * size.w, y: h.y * size.h + houseSize * 0.38 }));
    const out: { d: string }[] = [];
    const lampPts: Pt[] = [];
    const samples: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const bend = (i % 2 === 0 ? 1 : -1) * Math.min(40, len * 0.25);
      const c = { x: mx + nx * bend, y: my + ny * bend };
      out.push({ d: `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}` });
      // point on the curve at t = 0.5, pushed a bit to the side of the path
      const px = 0.25 * a.x + 0.5 * c.x + 0.25 * b.x;
      const py = 0.25 * a.y + 0.5 * c.y + 0.25 * b.y;
      const side = i % 2 === 0 ? 1 : -1;
      lampPts.push({ x: px + nx * 20 * side, y: py + ny * 20 * side + 8 });
      // sample the curve so the nature layer keeps off the path
      for (let s = 0; s <= 1.001; s += 0.08) {
        const u = 1 - s;
        samples.push({ x: u * u * a.x + 2 * u * s * c.x + s * s * b.x, y: u * u * a.y + 2 * u * s * c.y + s * s * b.y });
      }
    }
    return {
      paths: out,
      lamps: lampPts,
      pathPts: samples,
      housePts: houses.map((h) => ({ x: h.x * size.w, y: h.y * size.h })),
    };
  }, [houses, size, houseSize]);

  // A few stars at night, deterministic positions.
  const stars = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: ((i * 73) % 97) / 100, y: ((i * 37) % 23) / 100 + 0.02, r: i % 3 === 0 ? 1.8 : 1.1 })),
    [],
  );

  return (
    <View style={{ flex: 1, overflow: "hidden" }} onLayout={onLayout} testID="village-canvas">
      {size.w > 0 && (
        <>
          <Svg width={size.w} height={size.h} style={{ position: "absolute" }} pointerEvents="none">
            {isNight &&
              stars.map((s, i) => <Circle key={i} cx={s.x * size.w} cy={s.y * size.h} r={s.r} fill={colors.star} opacity={0.8} />)}
            {isNight && (
              <>
                <Circle cx={size.w - 46} cy={34} r={16} fill={colors.star} />
                <Circle cx={size.w - 39} cy={29} r={14} fill={colors.surface} />
              </>
            )}
            {paths.map((p, i) => (
              <Path key={`e${i}`} d={p.d} stroke={colors.pathEdge} strokeWidth={20} strokeLinecap="round" fill="none" opacity={0.5} />
            ))}
            {paths.map((p, i) => (
              <Path key={`p${i}`} d={p.d} stroke={colors.path} strokeWidth={15} strokeLinecap="round" fill="none" />
            ))}
            {paths.map((p, i) => (
              <Path
                key={`d${i}`}
                d={p.d}
                stroke={colors.pathEdge}
                strokeWidth={2}
                strokeDasharray="2 9"
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </Svg>
          <Nature w={size.w} h={size.h} houses={housePts} houseSize={houseSize} pathPts={pathPts} lamps={lamps} isNight={isNight} />
          {lamps.map((l, i) => (
            <StreetLamp key={i} x={l.x} y={l.y} lit={isNight} />
          ))}
          {houses.some((h) => h.key === BOAT_KEY) && <Lake w={size.w} h={size.h} />}
          {houses.map((h) => (
            <HouseSpot
              key={h.key}
              house={h}
              canvas={size}
              size={houseSize}
              editable={!!editable}
              lit={isNight}
              badge={badges[h.key]}
              onPress={() => onPressHouse?.(h)}
              onMove={onMove}
            />
          ))}
        </>
      )}
    </View>
  );
}

/** Un coin de lac en bas à droite : on n'en voit qu'un bout, le reste sort de la feuille. */
function Lake({ w, h }: { w: number; h: number }) {
  const { colors } = useTheme();
  const { isNight } = useNightMode();
  const lw = w * 0.66;
  const lh = h * 0.2;
  const water = isNight ? "#2F4558" : "#C9DDF0";
  const deep = isNight ? "#3C566C" : "#A9C8E4";
  return (
    <Svg width={lw} height={lh} viewBox="0 0 100 40" style={{ position: "absolute", right: 0, bottom: 0 }} pointerEvents="none">
      <Path
        d="M18 40 Q10 28 22 18 Q30 10 46 12 Q58 3 74 9 Q88 4 106 8 L106 44 L18 44 Z"
        fill={water}
        stroke={colors.houseInk}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <Path d="M24 40 Q18 30 27 22 Q34 16 46 18" stroke={deep} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Path d="M30 31 q3 -2 6 0 t6 0" stroke={deep} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <Path d="M70 20 q3 -2 6 0 t6 0" stroke={deep} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <Path d="M54 36 q3 -2 6 0 t6 0" stroke={deep} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* roseaux au bord */}
      <Path d="M20 22 L19 14 M23 20 L24 12 M26 18 L26 11" stroke={colors.leafDark} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}

function HouseSpot({
  house,
  canvas,
  size,
  editable,
  lit,
  badge,
  onPress,
  onMove,
}: {
  house: House;
  canvas: { w: number; h: number };
  size: number;
  editable: boolean;
  lit: boolean;
  badge?: number;
  onPress: () => void;
  onMove?: (key: string, x: number, y: number) => void;
}) {
  const styles = useStyles();
  const { season, mode: seasonMode } = useSeason();
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const latest = useRef({ house, canvas, onMove });
  latest.current = { house, canvas, onMove };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: () => editable,
        onPanResponderGrant: () => Animated.spring(scale, { toValue: 1.1, useNativeDriver: false }).start(),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          const { house: h, canvas: c, onMove: move } = latest.current;
          Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
          const nx = Math.max(0.05, Math.min(0.95, h.x + g.dx / c.w));
          const ny = Math.max(0.05, Math.min(0.95, h.y + g.dy / c.h));
          pan.setValue({ x: 0, y: 0 });
          move?.(h.key, nx, ny);
        },
        onPanResponderTerminate: () => {
          pan.setValue({ x: 0, y: 0 });
          Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
        },
      }),
    [editable, pan, scale],
  );

  const left = house.x * canvas.w - size / 2;
  const top = house.y * canvas.h - size / 2;

  return (
    <Animated.View
      {...(editable ? responder.panHandlers : {})}
      style={[
        styles.spot,
        { left, top, width: size, transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] },
        editable && styles.editing,
        !house.visible && styles.hidden,
      ]}
      testID={`house-${house.key}`}
    >
      <Pressable
        disabled={editable}
        onPress={onPress}
        testID={`house-${house.key}-button`}
        style={({ pressed }) => ({ alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}
      >
        <View>
          <HouseImage house={house} size={size * 0.82} lit={lit} snow={season === "winter"} />
          {showGarlands(seasonMode) && <Garland size={size * 0.82} />}
        </View>
        <Text style={styles.label} numberOfLines={2} testID={`house-${house.key}-label`}>
          {house.name}
        </Text>
      </Pressable>
      {!!badge && (
        <View style={styles.badge} testID={`house-${house.key}-badge`}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  spot: { position: "absolute", alignItems: "center" },
  editing: { borderWidth: 1.5, borderStyle: "dashed", borderColor: c.brandPrimary, borderRadius: 16 },
  hidden: { opacity: 0.35 },
  label: {
    fontFamily: "Caveat-Bold",
    fontSize: 21,
    lineHeight: 22,
    color: c.onSurface,
    textAlign: "center",
    marginTop: -2,
    backgroundColor: c.surface,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 5,
    backgroundColor: c.error,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: c.onError, fontFamily: fonts.bodyBold, fontSize: 12 },
}));
