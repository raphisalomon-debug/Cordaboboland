// Réglages (admin uniquement) : maisons, liens, images, carte, jour/nuit, compte.
import { Feather } from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, API_URL, authHeaders } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { Field, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { SEASON_LABELS, SeasonMode, setSeasonMode, useSeason } from "@/src/features/houses/season";
import { House, useAppSettings, useHouses } from "@/src/features/houses/api";
import { HouseImage } from "@/src/features/houses/HouseImage";
import { fonts, makeStyles, NightMode, setNightMode, useNightMode, useTheme } from "@/src/theme";
import { uploadForm } from "@/src/utils/upload";

const HOUSE_COLORS = ["#F6C6C6", "#F8D8E4", "#FAEDCD", "#F2D7B6", "#CCD5AE", "#D6E5D8", "#C9DDF0", "#E3D3EE", "#E8826B", "#E9C46A", "#8FB07A", "#7FB3D5"];

export default function ReglagesScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { mode } = useNightMode();
  const { mode: seasonMode, season } = useSeason();
  const { data: houses, isLoading } = useHouses();
  const [permSheet, setPermSheet] = useState(false);
  const { colors } = useTheme();
  const qc = useQueryClient();
  const { data: settings } = useAppSettings();
  const autoLayout = settings?.auto_layout !== false;
  const updateSettings = useMutation({
    mutationFn: (v: boolean) => api("/settings", { method: "PATCH", body: { auto_layout: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-settings"] }),
  });

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Réglages" testID="settings-header" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
      >
        <Text style={styles.section}>La carte</Text>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Rangement automatique</Text>
              <Text style={styles.cardSub}>
                {autoLayout
                  ? "Les maisons se rangent toutes seules le long du chemin, même quand tu en caches."
                  : "Les maisons restent exactement où tu les as posées."}
              </Text>
            </View>
            <Switch
              testID="auto-layout-switch"
              value={autoLayout}
              onValueChange={(v) => updateSettings.mutate(v)}
              trackColor={{ true: colors.success, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
        <SketchButton
          label={autoLayout ? "Changer l'ordre des maisons" : "Déplacer les maisons"}
          icon="move"
          variant="secondary"
          testID="edit-map-button"
          onPress={() => router.push("/reglages/carte")}
        />

        <Text style={styles.section}>Jour & nuit</Text>
        <View style={styles.modes}>
          {(
            [
              ["auto", "Auto (20h-7h)"],
              ["day", "Jour"],
              ["night", "Nuit"],
            ] as [NightMode, string][]
          ).map(([m, label]) => (
            <Pressable
              key={m}
              testID={`mode-${m}`}
              onPress={() => setNightMode(m)}
              style={[styles.mode, mode === m && styles.modeActive]}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Saison du village</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {(Object.keys(SEASON_LABELS) as SeasonMode[]).map((s) => (
            <Pressable
              key={s}
              testID={`season-${s}`}
              onPress={() => setSeasonMode(s)}
              style={[styles.seasonChip, seasonMode === s && styles.modeActive]}
            >
              <Text style={[styles.modeText, seasonMode === s && styles.modeTextActive]}>
                {s === "auto" ? `Auto (${SEASON_LABELS[season].toLowerCase()})` : SEASON_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.section}>Les maisons</Text>
        {isLoading ? (
          <Loading />
        ) : (
          (houses ?? []).map((h) => <HouseSettings key={h.key} house={h} onPermissionBlocked={() => setPermSheet(true)} />)
        )}

        <Text style={styles.section}>Compte</Text>
        <SketchButton label="Se déconnecter" icon="log-out" variant="ghost" testID="logout-button" onPress={logout} />
      </KeyboardAwareScrollView>

      <Sheet visible={permSheet} onClose={() => setPermSheet(false)} title="Accès aux photos" testID="photos-permission-sheet">
        <Text style={styles.text}>
          Pour choisir l&apos;image d&apos;une maison, autorise l&apos;accès à tes photos dans les réglages du téléphone.
        </Text>
        <SketchButton
          label="Ouvrir les réglages"
          testID="open-os-settings-button"
          onPress={() => {
            setPermSheet(false);
            Linking.openSettings();
          }}
        />
      </Sheet>
    </View>
  );
}

function HouseSettings({ house, onPermissionBlocked }: { house: House; onPermissionBlocked: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(house.name);
  const [target, setTarget] = useState(house.target);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(house.name);
    setTarget(house.target);
  }, [house.name, house.target]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["houses"] });
  const update = useMutation({
    mutationFn: (body: Partial<House>) => api(`/houses/${house.key}`, { method: "PATCH", body }),
    onSuccess: refresh,
    onError: (e: Error) => toast(e.message),
  });
  const resetImage = useMutation({
    mutationFn: () => api(`/houses/${house.key}/image`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast("Image d'origine remise");
    },
  });

  const dirty = name !== house.name || target !== house.target;

  const pickImage = async () => {
    // Permission flow: check -> ask once if possible -> otherwise offer OS settings.
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) onPermissionBlocked();
      else toast("Accès aux photos refusé");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const r = await uploadForm(`${API_URL}/houses/${house.key}/image`, {
        headers: authHeaders(),
        files: { file: { uri: asset.uri, name: asset.fileName ?? "maison.png", mimeType: asset.mimeType ?? "image/png" } },
      });
      if (!r.ok) throw new Error(r.status === 402 ? "Plus de crédits de stockage" : "Envoi impossible");
      refresh();
      toast("Nouvelle image posée !");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.card} testID={`house-settings-${house.key}`}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <HouseImage house={house} size={56} lit={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{house.name}</Text>
          <Text style={styles.cardSub}>{house.action === "link" ? "Lien externe" : `Page ${house.target}`}</Text>
        </View>
        <Switch
          testID={`house-visible-switch-${house.key}`}
          value={house.visible}
          onValueChange={(v) => update.mutate({ visible: v })}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>
      <Field label="Petit nom" testID={`house-name-input-${house.key}`} value={name} onChangeText={setName} />
      {house.action === "link" && (
        <Field
          label="Lien"
          testID={`house-url-input-${house.key}`}
          value={target}
          onChangeText={setTarget}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />
      )}
      {dirty && (
        <SketchButton
          label="Enregistrer"
          icon="check"
          testID={`house-save-button-${house.key}`}
          loading={update.isPending}
          onPress={() =>
            update.mutate(
              { name: name.trim(), ...(house.action === "link" ? { target: target.trim() } : {}) },
              { onSuccess: () => toast("Maison mise à jour") },
            )
          }
        />
      )}
      <Text style={styles.cardSub}>Couleur de la maison</Text>
      <View style={styles.swatches}>
        {HOUSE_COLORS.map((col) => (
          <Pressable
            key={col}
            testID={`house-color-${house.key}-${col.slice(1)}`}
            onPress={() => update.mutate({ color: col })}
            style={[styles.swatch, { backgroundColor: col }, house.color.toLowerCase() === col.toLowerCase() && styles.swatchOn]}
          >
            {house.color.toLowerCase() === col.toLowerCase() && <Feather name="check" size={14} color="#2B2824" />}
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <SketchButton
          label="Changer l'image"
          icon="image"
          variant="secondary"
          testID={`house-image-button-${house.key}`}
          loading={uploading}
          onPress={pickImage}
          style={{ flex: 1 }}
        />
        {house.image_path && (
          <Pressable testID={`house-image-reset-${house.key}`} onPress={() => resetImage.mutate()} style={styles.reset} hitSlop={6}>
            <Feather name="rotate-ccw" size={18} color={colors.onSurface} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  section: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface, marginTop: 8 },
  text: { fontFamily: fonts.body, fontSize: 15, color: c.onSurface },
  modes: { flexDirection: "row", gap: 8 },
  mode: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
  },
  modeActive: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  seasonChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
    flexShrink: 0,
  },
  modeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: c.muted },
  modeTextActive: { color: c.onBrandTertiary },
  card: { padding: 14, borderRadius: 16, backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: c.border, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 60, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: c.surface },
  cardTitle: { fontFamily: fonts.hand, fontSize: 24, color: c.onSurfaceSecondary },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  swatchOn: { borderWidth: 3, borderColor: c.onSurface },
  reset: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
}));
