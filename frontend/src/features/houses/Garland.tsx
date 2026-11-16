// Christmas lights draped under the roof of each house (December).
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/src/theme";

// Classic bulb colours, identical by day and night on purpose.
const BULBS = ["#E63946", "#2A9D8F", "#F4C430", "#457B9D"];

export function Garland({ size }: { size: number }) {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  // Two sagging curves across the eaves (≈ 48 % of the drawing height).
  const y = size * 0.47;
  const sag = size * 0.09;
  const x0 = size * 0.12;
  const xm = size * 0.5;
  const x1 = size * 0.88;
  const pt = (a: number, b: number, t: number) => {
    const cx = (a + b) / 2;
    const u = 1 - t;
    return { x: u * u * a + 2 * u * t * cx + t * t * b, y: u * u * y + 2 * u * t * (y + sag * 2) + t * t * y };
  };
  const bulbs = [0.2, 0.5, 0.8].flatMap((t) => [pt(x0, xm, t), pt(xm, x1, t)]);
  const r = Math.max(2.2, size * 0.032);

  const layer = (parity: number) => (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      {bulbs.map((b, i) =>
        i % 2 === parity ? (
          <Circle key={i} cx={b.x} cy={b.y + r} r={r} fill={BULBS[i % BULBS.length]} stroke={colors.houseInk} strokeWidth={0.6} />
        ) : null,
      )}
    </Svg>
  );

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }} testID="house-garland">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Path
          d={`M${x0},${y} Q${(x0 + xm) / 2},${y + sag * 2} ${xm},${y} Q${(xm + x1) / 2},${y + sag * 2} ${x1},${y}`}
          stroke={colors.houseInk}
          strokeWidth={1}
          fill="none"
        />
      </Svg>
      <Animated.View style={{ position: "absolute", opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }}>
        {layer(0)}
      </Animated.View>
      <Animated.View style={{ position: "absolute", opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }}>
        {layer(1)}
      </Animated.View>
    </View>
  );
}

/** December, or when the village is forced to winter in Réglages. */
export const showGarlands = (seasonMode: string) => new Date().getMonth() === 11 || seasonMode === "winter";
