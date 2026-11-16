// One otter sticker: custom PNG when provided in config/otters.ts, else emoji placeholder.
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { OtterDef } from "@/src/config/otters";

export function OtterSticker({ otter, size }: { otter: OtterDef; size: number }) {
  if (otter.image) {
    return <Image source={otter.image} style={{ width: size, height: size }} contentFit="contain" />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: otter.tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>🦦</Text>
      <Text style={{ position: "absolute", right: -2, bottom: -2, fontSize: size * 0.28 }}>{otter.emoji}</Text>
    </View>
  );
}
