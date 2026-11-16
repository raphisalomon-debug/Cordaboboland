// Fenêtre d'accueil : un bouquet a été offert, on le voit en grand avant d'aller le planter dans le gazon.
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SketchButton } from "@/src/components/ui";
import { Bouquet } from "@/src/features/fleuriste/api";
import { BouquetView } from "@/src/features/fleuriste/FlowerArt";
import { fonts, makeStyles } from "@/src/theme";

export function GiftModal({ bouquet, onPlant, onLater }: { bouquet: Bouquet | null; onPlant: () => void; onLater: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!bouquet} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onLater} />
        {bouquet && (
          <ScrollView
            style={styles.card}
            contentContainerStyle={{ alignItems: "center", gap: 10, padding: 18, paddingBottom: 18 + insets.bottom }}
            testID="gift-modal"
          >
            <Text style={styles.title}>{bouquet.author_name} t'a offert un bouquet !</Text>
            <BouquetView flowers={bouquet.flowers} size={270} />
            {!!bouquet.note && (
              <View style={styles.tag}>
                <View style={styles.hole} />
                <Text style={styles.note}>{bouquet.note}</Text>
              </View>
            )}
            <Text style={styles.hint}>Il faut le planter quelque part dans le gazon.</Text>
            <SketchButton testID="gift-plant" label="Planter dans le jardin" icon="map-pin" onPress={onPlant} style={{ alignSelf: "stretch" }} />
            <Text style={styles.later} onPress={onLater} testID="gift-later" suppressHighlighting>
              Plus tard
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, justifyContent: "center", padding: 18 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.surfaceInverse, opacity: 0.5 },
  card: {
    maxHeight: "92%",
    flexGrow: 0,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  title: { fontFamily: fonts.hand, fontSize: 30, color: c.onSurface, textAlign: "center" },
  tag: {
    alignSelf: "stretch",
    marginTop: -8,
    backgroundColor: "#F3E3C2",
    borderWidth: 1.5,
    borderColor: "#B8A684",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    transform: [{ rotate: "-1.2deg" }],
  },
  hole: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: "#B8A684",
  },
  note: { fontFamily: fonts.hand, fontSize: 24, color: "#3E3A35", textAlign: "center" },
  hint: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center" },
  later: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textDecorationLine: "underline", padding: 6 },
}));
