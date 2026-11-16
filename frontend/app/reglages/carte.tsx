// Éditeur de carte : glisser les maisons avec le doigt, puis enregistrer.
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { House, useAppSettings, useHouses } from "@/src/features/houses/api";
import { autoLayout, orderFromPositions } from "@/src/features/houses/layout";
import { Village } from "@/src/features/houses/Village";
import { fonts, makeStyles } from "@/src/theme";

export default function CarteScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useHouses();
  const { data: settings } = useAppSettings();
  const auto = settings?.auto_layout !== false;
  const [local, setLocal] = useState<House[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Auto mode previews exactly what home shows: only visible houses, re-spaced.
    if (data && settings) setLocal(auto ? autoLayout(data.filter((h) => h.visible)) : data);
  }, [data, settings, auto]);

  // Auto mode: dropping a house changes its place in the path, then all re-arrange.
  const move = (key: string, x: number, y: number) =>
    setLocal((prev) => {
      const next = prev.map((h) => (h.key === key ? { ...h, x, y } : h));
      return auto ? autoLayout(orderFromPositions(next)) : next;
    });

  const save = async () => {
    setSaving(true);
    try {
      let body;
      if (auto) {
        // Only the path order changes; manual positions stay untouched for later.
        const visibleOrder = orderFromPositions(local);
        const hidden = (data ?? []).filter((h) => !h.visible).sort((a, b) => a.order - b.order);
        body = [...visibleOrder, ...hidden].map((h, i) => ({ key: h.key, order: i + 1 }));
      } else {
        body = orderFromPositions(local).map(({ key, x, y, order }) => ({ key, x, y, order }));
      }
      await api("/houses/positions", { method: "PUT", body });
      await qc.invalidateQueries({ queryKey: ["houses"] });
      toast("Carte enregistrée !");
      router.back();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Paper margin={false} />
      <ScreenHeader title="La carte" testID="map-editor-header" />
      <Text style={styles.hint}>
        {auto
          ? "Glisse une maison plus haut ou plus bas pour changer sa place sur le chemin : les autres se rangent toutes seules."
          : "Glisse les maisons avec le doigt. Les maisons cachées sont pâles."}
      </Text>
      <View style={{ flex: 1 }}>{isLoading ? <Loading /> : <Village houses={local} editable onMove={move} />}</View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <SketchButton label="Enregistrer la carte" icon="check" testID="save-map-button" loading={saving} onPress={save} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, paddingHorizontal: 20 },
  bar: { paddingHorizontal: 20, paddingTop: 12 },
}));
