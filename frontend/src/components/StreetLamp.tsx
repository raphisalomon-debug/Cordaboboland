// Street lamp. At night the lantern is lit and a soft glow pulses around it.
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "@/src/theme";

export const LAMP_W = 30;
export const LAMP_H = 54;
const GLOW = 130;

export function StreetLamp({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!lit) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [lit, pulse]);

  // (x, y) = foot of the lamp
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - LAMP_W / 2, top: y - LAMP_H }}>
      {lit && (
        <Animated.View
          style={{ position: "absolute", left: LAMP_W / 2 - GLOW / 2, top: 10 - GLOW / 2, opacity: pulse }}
        >
          <Svg width={GLOW} height={GLOW}>
            <Defs>
              <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.glow} stopOpacity={0.65} />
                <Stop offset="45%" stopColor={colors.glow} stopOpacity={0.22} />
                <Stop offset="100%" stopColor={colors.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#g)" />
          </Svg>
        </Animated.View>
      )}
      <Svg width={LAMP_W} height={LAMP_H} viewBox="0 0 30 54">
        <Path d="M15 18 Q14 36 15 52" stroke={colors.lampPost} strokeWidth={3} strokeLinecap="round" />
        <Path d="M9 52 L21 52" stroke={colors.lampPost} strokeWidth={3} strokeLinecap="round" />
        <Path d="M8 6 L22 6 L20 18 L10 18 Z" fill={lit ? colors.lampGlass : colors.lampGlass} stroke={colors.lampPost} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M6 6 Q15 -1 24 6" fill={colors.lampPost} stroke={colors.lampPost} strokeWidth={2} />
        {lit && <Circle cx={15} cy={12} r={3.5} fill={colors.glow} />}
      </Svg>
    </View>
  );
}
