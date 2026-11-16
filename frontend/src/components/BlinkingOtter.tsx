// The otter mascot: eyes closed, and from time to time a little wink.
// When `tappable`, a tap makes her wink right away and a heart pops above.
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { LOADING_IMAGE, LOADING_WINK_IMAGE } from "@/src/config/assets";
import { Heart } from "@/src/features/houses/Nature";
import { useTheme } from "@/src/theme";

export function BlinkingOtter({ size, testID, tappable }: { size: number; testID?: string; tappable?: boolean }) {
  const { colors } = useTheme();
  const [wink, setWink] = useState(false);
  const [hearts, setHearts] = useState<number[]>([]);
  const nextId = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // wink every 2.5–5.5 s, for 450 ms
      timer = setTimeout(() => {
        setWink(true);
        timer = setTimeout(() => {
          setWink(false);
          schedule();
        }, 450);
      }, 2500 + Math.random() * 3000);
    };
    schedule();
    return () => {
      clearTimeout(timer);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const onTap = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWink(true);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setWink(false), 700);
    const id = nextId.current++;
    setHearts((hs) => [...hs.slice(-4), id]);
  };

  if (!LOADING_IMAGE) return null;
  const frames = (
    <>
      {/* both frames stay mounted so the switch is instant */}
      <Image source={LOADING_IMAGE} style={{ position: "absolute", width: size, height: size, opacity: wink ? 0 : 1 }} contentFit="contain" />
      {LOADING_WINK_IMAGE && (
        <Image source={LOADING_WINK_IMAGE} style={{ position: "absolute", width: size, height: size, opacity: wink ? 1 : 0 }} contentFit="contain" />
      )}
    </>
  );

  if (!tappable) {
    return (
      <View style={{ width: size, height: size }} testID={testID}>
        {frames}
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <Pressable testID={testID} onPress={onTap} hitSlop={6} style={({ pressed }) => ({ width: size, height: size, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        {frames}
      </Pressable>
      <View pointerEvents="none" style={{ position: "absolute", left: size / 2 - 22, top: size * 0.45, width: 44 }}>
        {hearts.map((id) => (
          <Heart key={id} c={colors} onDone={() => setHearts((hs) => hs.filter((x) => x !== id))} />
        ))}
      </View>
    </View>
  );
}
