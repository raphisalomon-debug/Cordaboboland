// Accueil : la feuille de cahier avec le petit village.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { BlinkingOtter } from "@/src/components/BlinkingOtter";
import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { EmptyState, IconButton, Loading } from "@/src/components/ui";
import { LOGO_IMAGE } from "@/src/config/assets";
import { House, useAppSettings, useHouses } from "@/src/features/houses/api";
import { autoLayout } from "@/src/features/houses/layout";
import { Village } from "@/src/features/houses/Village";
import { VerseOfDay } from "@/src/features/verses/VerseOfDay";
import { fonts, makeStyles, NightMode, setNightMode, useNightMode } from "@/src/theme";

const NEXT_MODE: Record<NightMode, NightMode> = { auto: "day", day: "night", night: "auto" };
const MODE_LABEL: Record<NightMode, string> = {
  auto: "Jour / nuit automatique",
  day: "Toujours le jour",
  night: "Toujours la nuit",
};

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const toast = useToast();
  const { user, logout } = useAuth();
  const { mode, isNight } = useNightMode();
  const { data: houses, isLoading } = useHouses();
  const { data: settings } = useAppSettings();

  // In-app notification: unread otters, polled every 15 s.
  const { data: unread } = useQuery({
    queryKey: ["otters-unread"],
    queryFn: () => api<{ count: number; latest: { from_name: string } | null }>("/otters/unread"),
    refetchInterval: 15000,
  });
  const lastCount = useRef<number | null>(null);
  useEffect(() => {
    if (!unread) return;
    if (lastCount.current !== null && unread.count > lastCount.current && unread.latest) {
      toast(`${unread.latest.from_name} t'a envoyé une loutre !`);
    }
    lastCount.current = unread.count;
  }, [unread, toast]);

  const visible = (houses ?? []).filter((h) => h.visible);
  const placed = settings?.auto_layout === false ? visible : autoLayout(visible);
  const loutresHouse = visible.find((h) => h.target === "/loutres");
  const badges = loutresHouse && unread?.count ? { [loutresHouse.key]: unread.count } : {};

  const openHouse = (h: House) => {
    if (h.action === "page") {
      router.push(h.target as any);
      return;
    }
    if (!h.target) {
      toast(user?.role === "admin" ? "Ajoute le lien dans les Réglages" : "Le lien n'est pas encore prêt");
      return;
    }
    Linking.openURL(h.target); // web: opens a new tab
  };

  return (
    <View style={styles.root} testID="home-screen">
      <Paper margin={false} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {LOGO_IMAGE && <BlinkingOtter size={46} testID="home-logo" tappable />}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} testID="home-title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Nos petites maisons
          </Text>
          <Text style={styles.hello} testID="home-greeting">
            {isNight ? "Bonne nuit" : "Coucou"} {user?.name}
          </Text>
        </View>
        <IconButton
          testID="night-mode-toggle"
          icon={mode === "auto" ? "clock" : mode === "day" ? "sun" : "moon"}
          onPress={() => {
            const next = NEXT_MODE[mode];
            setNightMode(next);
            toast(MODE_LABEL[next]);
          }}
        />
        {user?.role === "admin" ? (
          <IconButton testID="open-settings-button" icon="settings" onPress={() => router.push("/reglages")} />
        ) : (
          <IconButton testID="home-logout-button" icon="log-out" onPress={logout} />
        )}
      </View>
      <View style={styles.sheet}>
        {isLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState
            testID="home-empty"
            icon="home"
            title="Pas encore de maison"
            text="Active des maisons depuis les Réglages."
          />
        ) : (
          <Village houses={placed} badges={badges} onPressHouse={openHouse} />
        )}
      </View>
      <View style={{ paddingBottom: insets.bottom + 8 }}>
        <VerseOfDay />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 6 },
  title: { fontFamily: fonts.hand, fontSize: 25, color: c.onSurface },
  hello: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: -4 },
  sheet: { flex: 1, marginTop: 4 },
}));
