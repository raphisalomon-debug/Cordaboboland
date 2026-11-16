// "Verset du jour" card on the home sheet: a random verse from our folders.
import { Feather } from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { api } from "@/src/api";
import { Sheet } from "@/src/components/Sheet";
import { SketchButton } from "@/src/components/ui";
import { Verse } from "@/src/features/verses/api";
import { fonts, makeStyles, useTheme } from "@/src/theme";

type RandomVerse = Verse & { folder_name: string; folder_color: string };

export function VerseOfDay() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Picked once per app opening; the shuffle button draws another one.
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["verse-random"],
    queryFn: () => api<RandomVerse | null>("/verses/random"),
    staleTime: Infinity,
  });
  if (!data) return null;

  return (
    <>
      <Pressable
        testID="verse-of-day-card"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, { borderLeftColor: data.folder_color }, pressed && { opacity: 0.85 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Un verset pour toi · {data.reference}</Text>
          {!!data.text && (
            <Text style={styles.text} numberOfLines={2} testID="verse-of-day-text">
              « {data.text} »
            </Text>
          )}
        </View>
        <Pressable testID="verse-of-day-shuffle" hitSlop={10} onPress={() => refetch()} disabled={isFetching} style={styles.shuffle}>
          <Feather name="shuffle" size={18} color={colors.onSurfaceSecondary} />
        </Pressable>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={data.reference} testID="verse-of-day-sheet">
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 10 }}>
          {!!data.text && <Text style={styles.full}>« {data.text} »</Text>}
          {!!data.note && <Text style={styles.note}>{data.note}</Text>}
          <Text style={styles.meta}>
            dans « {data.folder_name} » · ajouté par {data.created_by_name}
          </Text>
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SketchButton label="Un autre" icon="shuffle" variant="secondary" testID="verse-sheet-shuffle" style={{ flex: 1 }} onPress={() => refetch()} />
          <SketchButton
            label="Le dossier"
            icon="folder"
            testID="verse-sheet-open-folder"
            style={{ flex: 1 }}
            onPress={() => {
              setOpen(false);
              router.push(`/versets/${data.folder_id}`);
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderLeftWidth: 6,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceSecondary,
  },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted },
  text: { fontFamily: fonts.hand, fontSize: 20, lineHeight: 22, color: c.onSurfaceSecondary },
  shuffle: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  full: { fontFamily: fonts.hand, fontSize: 26, lineHeight: 30, color: c.onSurface },
  note: { fontFamily: fonts.body, fontSize: 14, fontStyle: "italic", color: c.onSurface },
  meta: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
}));
