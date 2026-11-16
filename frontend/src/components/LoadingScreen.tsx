// Loading screen: uses LOADING_IMAGE from config/assets.ts when provided.
import { ActivityIndicator, Text, View } from "react-native";

import { BlinkingOtter } from "@/src/components/BlinkingOtter";
import { HouseArt } from "@/src/components/HouseArt";
import { Paper } from "@/src/components/Paper";
import { LOADING_IMAGE } from "@/src/config/assets";
import { useTheme } from "@/src/theme";

export function LoadingScreen({ fontsReady = true }: { fontsReady?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }} testID="loading-screen">
      <Paper />
      {LOADING_IMAGE ? (
        <BlinkingOtter size={200} testID="loading-otter" />
      ) : (
        <HouseArt size={120} color="#FAEDCD" lit={false} />
      )}
      {fontsReady && (
        <Text style={{ fontFamily: "Caveat-Bold", fontSize: 36, color: colors.onSurface }}>Nos petites maisons</Text>
      )}
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}
