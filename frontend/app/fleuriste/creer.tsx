// Composer un bouquet : forme / nombre / couleur des pétales, couleur du cœur, dessin sur la pétale,
// plusieurs fleurs, et un petit mot attaché.
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { ScreenHeader, SketchButton } from "@/src/components/ui";
import {
  CENTER_COLORS,
  Flower,
  MAX_FLOWERS,
  PEN_COLORS,
  PETAL_COLORS,
  SHAPES,
  newFlower,
  useBouquetActions,
} from "@/src/features/fleuriste/api";
import { DrawPad } from "@/src/features/fleuriste/DrawPad";
import { BouquetView, FlowerSvg, ShapeSwatch } from "@/src/features/fleuriste/FlowerArt";
import { fonts, makeStyles, useTheme } from "@/src/theme";

function Swatches({ colors: list, value, onPick, testPrefix }: { colors: string[]; value: string; onPick: (c: string) => void; testPrefix: string }) {
  const styles = useStyles();
  return (
    <View style={styles.swatches}>
      {list.map((c) => (
        <Pressable
          key={c}
          testID={`${testPrefix}-${c.slice(1)}`}
          onPress={() => onPick(c)}
          style={[styles.swatch, { backgroundColor: c }, value.toLowerCase() === c.toLowerCase() && styles.swatchOn]}
        >
          {value.toLowerCase() === c.toLowerCase() && <Feather name="check" size={16} color="#2B2824" />}
        </Pressable>
      ))}
    </View>
  );
}

export default function CreerBouquet() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { create } = useBouquetActions();

  const [flowers, setFlowers] = useState<Flower[]>([newFlower(0)]);
  const [idx, setIdx] = useState(0);
  const [note, setNote] = useState("");
  const [padOpen, setPadOpen] = useState(false);
  const [pen, setPen] = useState(PEN_COLORS[0]);
  const [thick, setThick] = useState(false);

  const cur = flowers[idx];
  const patch = (p: Partial<Flower>) => setFlowers((fs) => fs.map((f, i) => (i === idx ? { ...f, ...p } : f)));

  const addFlower = () => {
    if (flowers.length >= MAX_FLOWERS) return toast(`${MAX_FLOWERS} fleurs au maximum`);
    setFlowers((fs) => [...fs, newFlower(fs.length)]);
    setIdx(flowers.length);
  };
  const removeFlower = () => {
    if (flowers.length <= 1) return;
    setFlowers((fs) => fs.filter((_, i) => i !== idx));
    setIdx(Math.max(0, idx - 1));
  };
  const offer = () =>
    create.mutate(
      { flowers, note: note.trim() },
      {
        onSuccess: () => {
          toast("Bouquet offert 💐");
          router.back();
        },
        onError: (e: Error) => toast(e.message),
      },
    );

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Composer un bouquet" testID="creer-header" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={styles.preview} testID="creer-preview">
          <BouquetView flowers={flowers} size={230} />
        </View>

        <Text style={styles.section}>Mes fleurs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {flowers.map((f, i) => (
            <Pressable key={i} testID={`creer-flower-${i}`} onPress={() => setIdx(i)} style={[styles.chip, i === idx && styles.chipOn]}>
              <FlowerSvg flower={f} size={54} />
            </Pressable>
          ))}
          <Pressable testID="creer-add-flower" onPress={addFlower} style={[styles.chip, styles.chipAdd]}>
            <Feather name="plus" size={26} color={colors.muted} />
          </Pressable>
        </ScrollView>
        {flowers.length > 1 && (
          <Text style={styles.link} onPress={removeFlower} testID="creer-remove-flower" suppressHighlighting>
            Retirer cette fleur du bouquet
          </Text>
        )}

        <Text style={styles.section}>Forme des pétales</Text>
        <View style={styles.row}>
          {SHAPES.map((s) => (
            <Pressable
              key={s.key}
              testID={`creer-shape-${s.key}`}
              onPress={() => patch({ shape: s.key })}
              style={[styles.shape, cur.shape === s.key && styles.chipOn]}
            >
              <ShapeSwatch shape={s.key} size={48} color={cur.petal_color} />
              <Text style={styles.shapeLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Nombre de pétales</Text>
        <View style={styles.stepper}>
          <Pressable testID="creer-petals-minus" style={styles.stepBtn} onPress={() => patch({ petals: Math.max(3, cur.petals - 1) })}>
            <Feather name="minus" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.stepValue} testID="creer-petals-value">
            {cur.petals}
          </Text>
          <Pressable testID="creer-petals-plus" style={styles.stepBtn} onPress={() => patch({ petals: Math.min(16, cur.petals + 1) })}>
            <Feather name="plus" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        <Text style={styles.section}>Couleur des pétales</Text>
        <Swatches colors={PETAL_COLORS} value={cur.petal_color} onPick={(c) => patch({ petal_color: c })} testPrefix="creer-petal" />

        <Text style={styles.section}>Couleur du cœur</Text>
        <Swatches colors={CENTER_COLORS} value={cur.center_color} onPick={(c) => patch({ center_color: c })} testPrefix="creer-center" />

        <Text style={styles.section}>Dessin sur les pétales</Text>
        <SketchButton testID="creer-draw" label="Dessiner sur une pétale" icon="edit-2" variant="secondary" onPress={() => setPadOpen(true)} />
        {cur.drawing.length > 0 && (
          <Text style={styles.link} onPress={() => patch({ drawing: [] })} testID="creer-clear-drawing" suppressHighlighting>
            Effacer le dessin ({cur.drawing.length} trait{cur.drawing.length > 1 ? "s" : ""})
          </Text>
        )}

        <Text style={styles.section}>Petit mot</Text>
        <TextInput
          testID="creer-note"
          style={styles.note}
          value={note}
          onChangeText={setNote}
          placeholder="Un petit mot attaché au bouquet…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={300}
        />
        <SketchButton testID="creer-offer" label="Offrir le bouquet" icon="gift" onPress={offer} loading={create.isPending} />
      </ScrollView>

      <Sheet visible={padOpen} onClose={() => setPadOpen(false)} title="Dessine sur la pétale" testID="creer-pad-sheet">
        <View style={{ gap: 12 }}>
          <View style={styles.padTop}>
            <Text style={styles.padHint}>Ton dessin est reproduit sur toutes les pétales.</Text>
            <FlowerSvg flower={cur} size={84} />
          </View>
          <DrawPad flower={cur} penColor={pen} penWidth={thick ? 0.07 : 0.03} onChange={(drawing) => patch({ drawing })} />
          <Swatches colors={PEN_COLORS} value={pen} onPick={setPen} testPrefix="creer-pen" />
          <View style={styles.row}>
            <Pressable testID="creer-pen-size" style={styles.toolBtn} onPress={() => setThick((t) => !t)}>
              <Text style={styles.toolText}>{thick ? "Trait épais" : "Trait fin"}</Text>
            </Pressable>
            <Pressable testID="creer-pad-undo" style={styles.toolBtn} onPress={() => patch({ drawing: cur.drawing.slice(0, -1) })}>
              <Feather name="corner-up-left" size={16} color={colors.onSurface} />
              <Text style={styles.toolText}>Annuler</Text>
            </Pressable>
            <Pressable testID="creer-pad-clear" style={styles.toolBtn} onPress={() => patch({ drawing: [] })}>
              <Feather name="trash-2" size={16} color={colors.onSurface} />
              <Text style={styles.toolText}>Tout effacer</Text>
            </Pressable>
          </View>
          <SketchButton testID="creer-pad-done" label="Terminé" onPress={() => setPadOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  preview: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  section: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, marginTop: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { borderColor: c.brandPrimary, borderWidth: 3 },
  chipAdd: { borderStyle: "dashed" },
  shape: {
    width: 62,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  shapeLabel: { fontFamily: fonts.body, fontSize: 12, color: c.onSurfaceSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: 18 },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontFamily: fonts.hand, fontSize: 38, color: c.onSurface, minWidth: 48, textAlign: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchOn: { borderWidth: 3, borderColor: c.onSurface },
  link: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textDecorationLine: "underline", textAlign: "center", padding: 4 },
  note: {
    minHeight: 90,
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.onSurface,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    padding: 12,
    textAlignVertical: "top",
  },
  padTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  padHint: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: c.muted },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  toolText: { fontFamily: fonts.bodyBold, fontSize: 13, color: c.onSurface },
}));
