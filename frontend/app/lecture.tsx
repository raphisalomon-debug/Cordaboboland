// Lecture d'un chapitre, avec chapitre précédent / suivant. La progression est retenue.
import { Feather } from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";

import { fileSource } from "@/src/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paper } from "@/src/components/Paper";
import { Loading, ScreenHeader } from "@/src/components/ui";
import { progressKey, useBook } from "@/src/features/books/api";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export default function LectureScreen() {
  const { book: bookId, i } = useLocalSearchParams<{ book: string; i: string }>();
  const index = Number(i ?? 0) || 0;
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  const { data: book } = useBook(bookId);
  const chapters = book?.chapters ?? [];
  const chapter = chapters[index];

  useEffect(() => {
    if (chapter) storage.setItem(progressKey(bookId), index);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [bookId, index, chapter]);

  const go = (to: number) => router.setParams({ i: String(to) });

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title={book?.title ?? ""} testID="reader-header" />
      {!book ? (
        <Loading />
      ) : !chapter ? (
        <Text style={styles.missing}>Ce chapitre n&apos;existe plus.</Text>
      ) : (
        <>
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 28, paddingLeft: 44, paddingBottom: 32 }}>
            <Text style={styles.kicker}>Chapitre {index + 1}</Text>
            <Text style={styles.title} testID="reader-chapter-title">
              {chapter.title}
            </Text>
            {(chapter.photos ?? []).map((path) => (
              <Image key={path} source={fileSource(path)} style={styles.photo} contentFit="cover" />
            ))}
            <Text style={styles.content} testID="reader-content" selectable>
              {chapter.content || "(page blanche)"}
            </Text>
            {index === chapters.length - 1 && <Text style={styles.end}>~ Fin ~</Text>}
          </ScrollView>
          <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
            <Pressable
              testID="reader-prev-button"
              disabled={index === 0}
              onPress={() => go(index - 1)}
              style={[styles.nav, index === 0 && styles.disabled]}
            >
              <Feather name="chevron-left" size={22} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.pos} testID="reader-position">
              {index + 1} / {chapters.length}
            </Text>
            <Pressable
              testID="reader-next-button"
              disabled={index >= chapters.length - 1}
              onPress={() => go(index + 1)}
              style={[styles.nav, index >= chapters.length - 1 && styles.disabled]}
            >
              <Feather name="chevron-right" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 },
  title: { fontFamily: fonts.hand, fontSize: 36, lineHeight: 40, color: c.onSurface, marginBottom: 12 },
  content: { fontFamily: fonts.body, fontSize: 17, lineHeight: 32, color: c.onSurface },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 14, marginBottom: 14 },
  end: { fontFamily: fonts.hand, fontSize: 26, color: c.muted, textAlign: "center", marginTop: 24 },
  missing: { fontFamily: fonts.body, fontSize: 15, color: c.muted, textAlign: "center", marginTop: 40 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  nav: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.3 },
  pos: { fontFamily: fonts.hand, fontSize: 24, color: c.onSurface },
}));
