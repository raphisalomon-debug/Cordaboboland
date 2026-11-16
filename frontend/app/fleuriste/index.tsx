// Fleuriste : les bouquets qu'on s'est offerts, avec leur petit mot.
import { Feather } from "@react-native-vector-icons/feather";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { useBouquetActions, useBouquets } from "@/src/features/fleuriste/api";
import { BouquetView } from "@/src/features/fleuriste/FlowerArt";
import { fonts, makeStyles, useTheme } from "@/src/theme";

dayjs.locale("fr");

export default function Fleuriste() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading } = useBouquets();
  const { remove } = useBouquetActions();

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Fleuriste" testID="fleuriste-header" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
        <SketchButton testID="fleuriste-create" label="Composer un bouquet" icon="plus" onPress={() => router.push("/fleuriste/creer")} />
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <EmptyState icon="gift" title="Pas encore de bouquet" text="Compose une fleur, ajoute un petit mot, et offre-la !" testID="fleuriste-empty" />
        ) : (
          data.map((b) => (
            <View key={b.id} style={styles.card} testID={`bouquet-${b.id}`}>
              <BouquetView flowers={b.flowers} size={230} />
              {!!b.note && (
                <View style={styles.tag}>
                  <View style={styles.hole} />
                  <Text style={styles.note}>{b.note}</Text>
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.from}>
                  De {b.author_name} · {dayjs(b.created_at).format("D MMM")}
                </Text>
                {b.author_id === user?.id && (
                  <Pressable
                    testID={`bouquet-delete-${b.id}`}
                    hitSlop={10}
                    onPress={() => remove.mutate(b.id, { onError: (e: Error) => toast(e.message) })}
                  >
                    <Feather name="trash-2" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  card: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  tag: {
    marginTop: -10,
    alignSelf: "stretch",
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
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: "#B8A684",
  },
  note: { fontFamily: fonts.hand, fontSize: 24, color: "#3E3A35", textAlign: "center" },
  meta: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  from: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
}));
