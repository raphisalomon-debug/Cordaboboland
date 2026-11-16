// Life in the village: trees, bushes, flowers, grass and a few discreet
// animals (cat, rabbit, hedgehog, a bird, butterflies by day, fireflies by
// night). Everything is placed automatically in the free spots, away from
// houses, paths and lamps, so it adapts when houses move or are hidden.
import * as Haptics from "expo-haptics";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import { Season, useSeason } from "@/src/features/houses/season";
import { ThemeColors, useTheme } from "@/src/theme";

type Pt = { x: number; y: number };
type Props = { w: number; h: number; houses: Pt[]; houseSize: number; pathPts: Pt[]; lamps: Pt[]; isNight: boolean };
type Deco = { kind: "tree" | "pine" | "bush" | "flowers" | "grass"; x: number; y: number; seed: number };

// Deterministic pseudo-random (same village every time).
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const CELL = 38;

function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, initial = 0) {
  const v = useRef(new Animated.Value(initial)).current;
  useEffect(() => {
    const loop = Animated.loop(make(v));
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return v;
}

const t = (v: Animated.Value, toValue: number, duration: number, delay = 0) =>
  Animated.timing(v, { toValue, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true });

export function Nature({ w, h, houses, houseSize, pathPts, lamps, isNight }: Props) {
  const { colors } = useTheme();
  const { season } = useSeason();

  // ---- find free spots --------------------------------------------------
  const { decos, animals } = useMemo(() => {
    const free = (x: number, y: number, pad = 0) => {
      if (x < 14 || x > w - 14 || y < 16 || y > h - 8) return false;
      for (const p of houses) {
        const dx = Math.abs(x - p.x);
        const dy = y - p.y;
        if (dx < houseSize * 0.62 + pad && dy > -houseSize * 0.6 - pad && dy < houseSize * 0.72 + pad) return false;
      }
      for (const p of pathPts) if (Math.hypot(x - p.x, y - p.y) < 19 + pad) return false;
      for (const l of lamps) if (Math.abs(x - l.x) < 18 + pad && y > l.y - 60 && y < l.y + 10) return false;
      return true;
    };
    const out: Deco[] = [];
    const spots: Pt[] = [];
    let trees = 0;
    for (let r = 0; r * CELL < h; r++) {
      for (let c = 0; c * CELL < w; c++) {
        const i = r * 97 + c;
        const x = c * CELL + CELL / 2 + (rand(i) - 0.5) * CELL * 0.6;
        const y = r * CELL + CELL / 2 + (rand(i + 7) - 0.5) * CELL * 0.6;
        if (!free(x, y)) continue;
        const k = rand(i + 13);
        if (k < 0.16 && trees < 10 && free(x, y - 28, 4)) {
          out.push({ kind: rand(i + 3) < 0.35 ? "pine" : "tree", x, y, seed: i });
          trees++;
        } else if (k < 0.36) out.push({ kind: "flowers", x, y, seed: i });
        else if (k < 0.45) out.push({ kind: "bush", x, y, seed: i });
        else if (k < 0.58) out.push({ kind: "grass", x, y, seed: i });
        else spots.push({ x, y });
      }
    }
    // Pick 3 calm spots for the animals, spread across the sheet.
    const sorted = [...spots].sort((a, b) => rand(a.x * 3 + a.y) - rand(b.x * 3 + b.y));
    const picked: Pt[] = [];
    for (const s of sorted) {
      if (picked.every((p) => Math.hypot(p.x - s.x, p.y - s.y) > h / 4)) picked.push(s);
      if (picked.length === 3) break;
    }
    return { decos: out.sort((a, b) => a.y - b.y), animals: picked };
  }, [w, h, houses, houseSize, pathPts, lamps]);

  const warm = season === "spring" || season === "summer";
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>
      <Svg width={w} height={h} style={{ position: "absolute" }} pointerEvents="none">
        {decos.filter((d) => d.kind !== "tree" && d.kind !== "pine").map((d) => (
          <Ground key={d.seed} d={d} c={colors} season={season} />
        ))}
      </Svg>
      {decos.filter((d) => d.kind === "tree" || d.kind === "pine").map((d) => (
        <Tree key={d.seed} d={d} c={colors} season={season} />
      ))}
      {animals[0] && (
        <Cuddly at={animals[0]} c={colors} testID="animal-cat">
          <Cat c={colors} night={isNight} />
        </Cuddly>
      )}
      {animals[1] && (
        <Cuddly at={animals[1]} c={colors} testID="animal-rabbit">
          <Rabbit c={colors} />
        </Cuddly>
      )}
      {/* the hedgehog hibernates in winter */}
      {animals[2] && season !== "winter" && (
        <Cuddly at={animals[2]} c={colors} testID="animal-hedgehog">
          <Hedgehog c={colors} />
        </Cuddly>
      )}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>
        {season === "winter" && Array.from({ length: 16 }, (_, i) => <Snowflake key={i} i={i} w={w} h={h} c={colors} />)}
        {season === "autumn" && Array.from({ length: 7 }, (_, i) => <FallingLeaf key={i} i={i} w={w} h={h} c={colors} />)}
        {isNight
          ? warm && Array.from({ length: 9 }, (_, i) => <Firefly key={i} i={i} w={w} h={h} c={colors} />)
          : (
            <>
              {warm && <Butterfly x={w * 0.18} y={h * 0.3} color={colors.petalA} c={colors} delay={0} />}
              {warm && <Butterfly x={w * 0.78} y={h * 0.66} color={colors.petalC} c={colors} delay={1500} />}
              <Bird w={w} y={h * 0.05 + 10} c={colors} />
            </>
          )}
      </View>
    </View>
  );
}

// ---- tap an animal: a little heart pops above it ---------------------------
function Cuddly({ at, c, testID, children }: { at: Pt; c: ThemeColors; testID: string; children: ReactNode }) {
  const [hearts, setHearts] = useState<number[]>([]);
  const next = useRef(0);
  const pop = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = next.current++;
    setHearts((hs) => [...hs.slice(-4), id]);
  };
  return (
    <View style={{ position: "absolute", left: at.x - 22, top: at.y - 40, width: 44, height: 44 }}>
      <Pressable testID={testID} onPress={pop} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "flex-end" }}>
        {children}
      </Pressable>
      {hearts.map((id) => (
        <Heart key={id} c={c} onDone={() => setHearts((hs) => hs.filter((x) => x !== id))} />
      ))}
    </View>
  );
}

export function Heart({ c, onDone }: { c: ThemeColors; onDone: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  const drift = useRef((Math.random() - 0.5) * 16).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 13,
        top: -4,
        opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -38] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { scale: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1.2, 1] }) },
        ],
      }}
    >
      <Svg width={18} height={16} viewBox="0 0 18 16">
        <Path d="M9 15 C2 10 0 7 0 4.5 C0 2 2 0 4.5 0 C6.5 0 8 1.2 9 3 C10 1.2 11.5 0 13.5 0 C16 0 18 2 18 4.5 C18 7 16 10 9 15 Z" fill={c.heart} stroke={c.houseInk} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

// ---- ground decorations (one shared Svg) ---------------------------------
function Ground({ d, c, season }: { d: Deco; c: ThemeColors; season: Season }) {
  const { x, y, seed } = d;
  const ink = c.houseInk;
  if (season === "winter") {
    if (d.kind === "grass") return null;
    if (d.kind === "flowers") return <Ellipse cx={x} cy={y - 2} rx={9} ry={3} fill={c.snow} opacity={0.9} />;
  }
  if (season === "autumn" && d.kind === "flowers") {
    // a little pile of fallen leaves
    const cols = [c.autumnA, c.autumnB, c.autumnC];
    return (
      <G>
        {[-5, 1, 6].map((dx, k) => (
          <Ellipse key={k} cx={x + dx} cy={y - 2 - (k % 2) * 2} rx={k === 1 ? 2.5 : 3.8} ry={k === 1 ? 3 : 2} fill={cols[k]} stroke={ink} strokeWidth={0.6} />
        ))}
      </G>
    );
  }
  if (d.kind === "grass")
    return <Path d={`M${x - 5} ${y} q1 -6 2 -8 M${x} ${y} q0 -7 1 -10 M${x + 5} ${y} q-1 -5 -2 -7`} stroke={c.leafDark} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
  if (d.kind === "bush") {
    const fill = season === "autumn" ? c.autumnA : c.leaf;
    return (
      <G>
        <Ellipse cx={x - 6} cy={y - 4} rx={8} ry={6} fill={fill} stroke={ink} strokeWidth={1.2} />
        <Ellipse cx={x + 6} cy={y - 4} rx={8} ry={6} fill={fill} stroke={ink} strokeWidth={1.2} />
        <Ellipse cx={x} cy={y - 8} rx={8} ry={6.5} fill={fill} stroke={ink} strokeWidth={1.2} />
        {season === "winter" && <Path d={`M${x - 12} ${y - 7} Q${x - 6} ${y - 16} ${x} ${y - 14} Q${x + 7} ${y - 16} ${x + 12} ${y - 7} Q${x} ${y - 10} ${x - 12} ${y - 7} Z`} fill={c.snow} />}
        {season !== "winter" && rand(seed + 5) < 0.5 && <Circle cx={x + 3} cy={y - 9} r={1.6} fill={c.petalA} />}
      </G>
    );
  }
  const petals = [c.petalA, c.petalB, c.petalC];
  return (
    <G>
      {[-6, 0, 6].map((dx, k) => {
        const hgt = 8 + rand(seed + k) * 6;
        const col = petals[Math.floor(rand(seed + k + 9) * 3)];
        return (
          <G key={k}>
            <Path d={`M${x + dx} ${y} L${x + dx * 0.8} ${y - hgt}`} stroke={c.leafDark} strokeWidth={1.3} />
            <Circle cx={x + dx * 0.8} cy={y - hgt} r={3.2} fill={col} stroke={ink} strokeWidth={0.8} />
            <Circle cx={x + dx * 0.8} cy={y - hgt} r={1} fill={c.petalCenter} />
          </G>
        );
      })}
    </G>
  );
}

// ---- trees sway gently -----------------------------------------------------
function Tree({ d, c, season }: { d: Deco; c: ThemeColors; season: Season }) {
  const sway = useLoop((v) => Animated.sequence([t(v, 1, 2600 + (d.seed % 7) * 200), t(v, -1, 2600 + (d.seed % 5) * 200)]));
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-2.5deg", "2.5deg"] });
  const ink = c.houseInk;
  const autumnCols = [c.autumnA, c.autumnB, c.autumnC];
  const canopy = season === "autumn" ? autumnCols[d.seed % 3] : c.leaf;
  const bare = season === "winter" && d.kind === "tree";
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: d.x - 17, top: d.y - 46, transform: [{ translateY: 23 }, { rotate }, { translateY: -23 }] }}>
      <Svg width={34} height={48} viewBox="0 0 34 48">
        <Path d="M15 47 L15.5 30 L18.5 30 L19 47 Z" fill={c.trunk} stroke={ink} strokeWidth={1.2} />
        {bare ? (
          <>
            {/* bare winter branches with snow */}
            <Path d="M17 31 L17 10 M17 22 L9 14 M17 18 L25 11 M11 16 L7 9 M23 13 L27 6 M17 12 L14 5" stroke={c.trunk} strokeWidth={2} strokeLinecap="round" />
            <Ellipse cx={9} cy={13.5} rx={3} ry={1.4} fill={c.snow} />
            <Ellipse cx={25} cy={10.5} rx={3} ry={1.4} fill={c.snow} />
            <Ellipse cx={17} cy={9.5} rx={2.5} ry={1.3} fill={c.snow} />
          </>
        ) : d.kind === "pine" ? (
          <>
            <Path d="M17 4 L27 20 L7 20 Z" fill={c.leafDark} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
            <Path d="M17 12 L30 32 L4 32 Z" fill={c.leaf} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
            {season === "winter" && (
              <>
                <Path d="M17 4 L21 10.5 Q17 9 13 10.5 Z" fill={c.snow} />
                <Path d="M17 12 L22 19.5 Q17 18 12 19.5 Z" fill={c.snow} />
              </>
            )}
          </>
        ) : (
          <>
            <Circle cx={10} cy={22} r={8} fill={canopy} stroke={ink} strokeWidth={1.3} />
            <Circle cx={24} cy={22} r={8} fill={canopy} stroke={ink} strokeWidth={1.3} />
            <Circle cx={17} cy={14} r={11} fill={canopy} stroke={ink} strokeWidth={1.3} />
            <Circle cx={13} cy={12} r={1.4} fill={c.leafDark} />
            <Circle cx={21} cy={18} r={1.4} fill={c.leafDark} />
            {season === "spring" &&
              [[11, 10], [22, 13], [16, 19], [8, 21], [26, 23]].map(([cx, cy], k) => (
                <Circle key={k} cx={cx} cy={cy} r={1.8} fill={c.blossom} stroke={ink} strokeWidth={0.5} />
              ))}
            {season === "summer" && rand(d.seed) < 0.4 && <Circle cx={20} cy={10} r={2} fill={c.petalA} stroke={ink} strokeWidth={0.6} />}
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

// ---- seasonal particles ----------------------------------------------------
function Snowflake({ i, w, h, c }: { i: number; w: number; h: number; c: ThemeColors }) {
  const fall = useLoop((v) =>
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 7000 + rand(i + 5) * 5000, delay: rand(i + 9) * 4000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]),
  );
  const x = rand(i + 301) * w;
  const sway = 10 + rand(i + 3) * 14;
  const r = 1.5 + rand(i + 11) * 1.8;
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-10, h] }) },
          { translateX: fall.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, sway, 0, -sway, 0] }) },
        ],
      }}
    >
      <Svg width={r * 2 + 2} height={r * 2 + 2}>
        <Circle cx={r + 1} cy={r + 1} r={r} fill={c.snow} stroke={c.border} strokeWidth={0.5} />
      </Svg>
    </Animated.View>
  );
}

function FallingLeaf({ i, w, h, c }: { i: number; w: number; h: number; c: ThemeColors }) {
  const fall = useLoop((v) =>
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 9000 + rand(i + 5) * 5000, delay: rand(i + 9) * 6000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]),
  );
  const x = rand(i + 401) * w;
  const col = [c.autumnA, c.autumnB, c.autumnC][i % 3];
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        opacity: fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-10, h * 0.9] }) },
          { translateX: fall.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, 22, -10, 14] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "540deg"] }) },
        ],
      }}
    >
      <Svg width={12} height={8} viewBox="0 0 12 8">
        <Path d="M1 4 Q6 -2 11 4 Q6 10 1 4 Z" fill={col} stroke={c.houseInk} strokeWidth={0.7} />
      </Svg>
    </Animated.View>
  );
}

// ---- animals ---------------------------------------------------------------
function Cat({ c, night }: { c: ThemeColors; night: boolean }) {
  const tail = useLoop((v) => Animated.sequence([t(v, 1, 700, 2500), t(v, 0, 700)]));
  const rotate = tail.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-25deg"] });
  const ink = c.houseInk;
  return (
    <View pointerEvents="none" style={{ width: 24, height: 24 }}>
      <Animated.View style={{ position: "absolute", left: 14, top: 6, transform: [{ translateX: 0 }, { translateY: 8 }, { rotate }, { translateY: -8 }] }}>
        <Svg width={14} height={16}>
          <Path d="M2 15 Q12 12 10 2" stroke={c.fur} strokeWidth={3} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Ellipse cx={12} cy={17} rx={7} ry={6} fill={c.fur} stroke={ink} strokeWidth={1.2} />
        <Path d="M6 6 L7 1 L10 4 L14 4 L17 1 L18 6 Q18 12 12 12 Q6 12 6 6 Z" fill={c.fur} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
        {night ? (
          <>
            <Circle cx={9.5} cy={7} r={1.3} fill={c.glow} />
            <Circle cx={14.5} cy={7} r={1.3} fill={c.glow} />
          </>
        ) : (
          <Path d="M8.5 7 q1 -1 2 0 M13.5 7 q1 -1 2 0" stroke={ink} strokeWidth={0.9} fill="none" />
        )}
      </Svg>
    </View>
  );
}

function Rabbit({ c }: { c: ThemeColors }) {
  const hop = useLoop((v) => Animated.sequence([t(v, 1, 220, 3200), t(v, 0, 260), t(v, 1, 200, 120), t(v, 0, 240)]));
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const ink = c.houseInk;
  return (
    <Animated.View pointerEvents="none" style={{ transform: [{ translateY }] }}>
      <Svg width={22} height={24} viewBox="0 0 22 24">
        <Ellipse cx={8} cy={4.5} rx={1.8} ry={4.5} fill={c.furLight} stroke={ink} strokeWidth={1} />
        <Ellipse cx={12} cy={4.5} rx={1.8} ry={4.5} fill={c.furLight} stroke={ink} strokeWidth={1} />
        <Ellipse cx={12} cy={18} rx={8} ry={5.5} fill={c.furLight} stroke={ink} strokeWidth={1.2} />
        <Circle cx={10} cy={11} r={4.5} fill={c.furLight} stroke={ink} strokeWidth={1.2} />
        <Circle cx={19.5} cy={17} r={2} fill={c.furLight} stroke={ink} strokeWidth={1} />
        <Circle cx={9} cy={10.5} r={0.9} fill={ink} />
      </Svg>
    </Animated.View>
  );
}

function Hedgehog({ c }: { c: ThemeColors }) {
  const walk = useLoop((v) => Animated.sequence([t(v, 1, 5000, 1000), t(v, 0, 5000, 1500)]));
  const translateX = walk.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
  const ink = c.houseInk;
  return (
    <Animated.View pointerEvents="none" style={{ transform: [{ translateX }] }}>
      <Svg width={24} height={14} viewBox="0 0 24 14">
        <Path d="M2 13 Q2 2 12 2 Q19 2 20 8 L23 10 L20 12 L19 13 Z" fill={c.furDark} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
        <Path d="M6 5 l-2 -2 M9 3.5 l-1 -2.5 M12 3 l0 -2.5 M15 3.5 l1 -2.5" stroke={ink} strokeWidth={1} />
        <Circle cx={19} cy={8} r={0.9} fill={ink} />
      </Svg>
    </Animated.View>
  );
}

function Butterfly({ x, y, color, c, delay }: { x: number; y: number; color: string; c: ThemeColors; delay: number }) {
  const fly = useLoop((v) => Animated.sequence([t(v, 1, 4000, delay), t(v, 0, 4000)]));
  const flap = useLoop((v) => Animated.sequence([Animated.timing(v, { toValue: 0.3, duration: 180, useNativeDriver: true }), Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: true })]), 1);
  const translateX = fly.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 18, 30, 14, 0] });
  const translateY = fly.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -14, 0, 10, 0] });
  return (
    <Animated.View style={{ position: "absolute", left: x, top: y, transform: [{ translateX }, { translateY }, { scaleX: flap }] }}>
      <Svg width={14} height={12} viewBox="0 0 14 12">
        <Ellipse cx={4} cy={4} rx={3.5} ry={3.5} fill={color} stroke={c.houseInk} strokeWidth={0.8} />
        <Ellipse cx={10} cy={4} rx={3.5} ry={3.5} fill={color} stroke={c.houseInk} strokeWidth={0.8} />
        <Ellipse cx={4.5} cy={9} rx={2.5} ry={2.2} fill={color} stroke={c.houseInk} strokeWidth={0.8} />
        <Ellipse cx={9.5} cy={9} rx={2.5} ry={2.2} fill={color} stroke={c.houseInk} strokeWidth={0.8} />
        <Path d="M7 2 L7 11" stroke={c.houseInk} strokeWidth={1.2} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Bird({ w, y, c }: { w: number; y: number; c: ThemeColors }) {
  const fly = useLoop((v) =>
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, delay: 7000, useNativeDriver: true }),
    ]),
  );
  const flap = useLoop((v) => Animated.sequence([t(v, 0.4, 220), t(v, 1, 220)]), 1);
  const translateX = fly.interpolate({ inputRange: [0, 1], outputRange: [-30, w + 30] });
  const translateY = fly.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, -8, 4, -4] });
  return (
    <Animated.View style={{ position: "absolute", left: 0, top: y, transform: [{ translateX }, { translateY }, { scaleY: flap }] }}>
      <Svg width={18} height={8} viewBox="0 0 18 8">
        <Path d="M1 2 Q5 7 9 4 Q13 7 17 2" stroke={c.houseInk} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

function Firefly({ i, w, h, c }: { i: number; w: number; h: number; c: ThemeColors }) {
  const glow = useLoop((v) => Animated.sequence([t(v, 1, 1200 + i * 130, i * 400), t(v, 0.1, 1400 + i * 90)]), 0.1);
  const translateY = glow.interpolate({ inputRange: [0, 1], outputRange: [4, -6] });
  const x = rand(i + 101) * (w - 20) + 10;
  const y = h * 0.15 + rand(i + 202) * h * 0.8;
  return (
    <Animated.View style={{ position: "absolute", left: x, top: y, opacity: glow, transform: [{ translateY }] }}>
      <Svg width={12} height={12}>
        <Circle cx={6} cy={6} r={5.5} fill={c.glow} opacity={0.3} />
        <Circle cx={6} cy={6} r={2} fill={c.glow} />
      </Svg>
    </Animated.View>
  );
}
