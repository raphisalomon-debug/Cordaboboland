// Folder sheet: create or rename a folder + pick its pastel colour.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/src/components/Sheet";
import { Field, SketchButton } from "@/src/components/ui";
import { FOLDER_COLORS } from "@/src/features/verses/api";
import { fonts, makeStyles } from "@/src/theme";

export function FolderSheet({
  visible,
  onClose,
  initial,
  onSubmit,
  loading,
  error,
  labels = {
    create: "Nouveau dossier",
    edit: "Renommer le dossier",
    field: "Nom du dossier",
    placeholder: "Paix, Amour, Confiance...",
    submit: "Créer le dossier",
  },
}: {
  visible: boolean;
  onClose: () => void;
  initial?: { name: string; color: string };
  onSubmit: (v: { name: string; color: string }) => void;
  loading: boolean;
  error: string;
  labels?: { create: string; edit: string; field: string; placeholder: string; submit: string };
}) {
  const styles = useStyles();
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    if (visible) {
      setTyped(false);
      setName(initial?.name ?? "");
      setColor(initial?.color ?? FOLDER_COLORS[0]);
    }
  }, [visible, initial?.name, initial?.color]);

  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? labels.edit : labels.create} testID="folder-sheet">
      <Field label={labels.field} testID="folder-name-input" value={name} onChangeText={(v) => { setName(v); setTyped(true); }} placeholder={labels.placeholder} maxLength={80} />
      <Text style={styles.label}>Couleur</Text>
      <View style={styles.colors}>
        {FOLDER_COLORS.map((c) => (
          <Pressable
            key={c}
            testID={`folder-color-${c.slice(1)}`}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
          />
        ))}
      </View>
      {!!error && !typed && <Text style={styles.error} testID="folder-form-error">{error}</Text>}
      <SketchButton label={initial ? "Enregistrer" : labels.submit} testID="folder-submit-button" loading={loading} onPress={() => { setTyped(false); onSubmit({ name, color }); }} />
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontFamily: fonts.hand, fontSize: 22, color: c.onSurface },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.border },
  swatchActive: { borderWidth: 3, borderColor: c.brandPrimary },
  error: { fontFamily: fonts.bodyBold, color: c.error, fontSize: 14 },
}));
