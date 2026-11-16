// Lined notebook paper background (fills its parent, sits behind content).
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { useTheme } from "@/src/theme";

export const LINE_GAP = 32;

export function Paper({ margin = true }: { margin?: boolean }) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const lines = useMemo(() => Array.from({ length: Math.ceil(height / LINE_GAP) + 2 }), [height]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]}>
      {lines.map((_, i) => (
        <View
          key={i}
          style={[styles.line, { top: 72 + i * LINE_GAP, backgroundColor: colors.paperLine }]}
        />
      ))}
      {margin && <View style={[styles.margin, { backgroundColor: colors.marginLine }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: "absolute", left: 0, right: 0, height: 1 },
  margin: { position: "absolute", top: 0, bottom: 0, left: 28, width: 1.5, opacity: 0.7 },
});
