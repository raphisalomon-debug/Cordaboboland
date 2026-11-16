// Loading screen: uses LOADING_IMAGE from config/assets.ts when provided.
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { BlinkingOtter } from "@/src/components/BlinkingOtter";
import { HouseArt } from "@/src/components/HouseArt";
import { Paper } from "@/src/components/Paper";
import { LOADING_IMAGE } from "@/src/config/assets";
import { useTheme } from "@/src/theme";

// Vide les copies en cache du navigateur et recharge la page (web uniquement).
async function resetAndReload() {
  if (Platform.OS !== "web") return;
  const g = globalThis as any;
  try {
    const regs = (await g.navigator?.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r: any) => r.unregister()));
  } catch {}
  try {
    const keys = (await g.caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k: string) => g.caches.delete(k)));
  } catch {}
  g.location?.reload?.();
}

export function LoadingScreen({ fontsReady = true, stage }: { fontsReady?: boolean; stage?: string }) {
  const { colors } = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
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
      {slow && (
        <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: fontsReady ? "Nunito-Regular" : undefined, color: colors.onSurface, textAlign: "center" }}>
            Ça met du temps… le serveur gratuit se réveille parfois (jusqu'à 1 minute){stage ? ` [${stage}]` : ""}
          </Text>
          <Pressable
            onPress={resetAndReload}
            accessibilityRole="button"
            style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.brandPrimary }}
          >
            <Text style={{ fontFamily: fontsReady ? "Nunito-Bold" : undefined, color: "#fff" }}>Réessayer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
