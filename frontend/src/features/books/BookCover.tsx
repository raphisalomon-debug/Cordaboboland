// A small book cover (used on the library shelves and the book page).
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { fileSource } from "@/src/api";

import { Book, isNew } from "@/src/features/books/api";
import { fonts, makeStyles } from "@/src/theme";

export function BookCover({ book, width }: { book: Book; width: number }) {
  const styles = useStyles();
  return (
    <View style={[styles.cover, { width, height: width * 1.4, backgroundColor: book.color }]}>
      {book.cover_path ? (
        <Image source={fileSource(book.cover_path)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={book.title} />
      ) : (
        <>
          <Text style={[styles.title, { fontSize: Math.max(16, width / 5.2) }]} numberOfLines={4}>
            {book.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author_name}
          </Text>
        </>
      )}
      <View style={styles.spine} />
      {isNew(book) && (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>Nouveau</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  cover: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  spine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8, backgroundColor: c.houseInk, opacity: 0.18 },
  title: { fontFamily: fonts.hand, lineHeight: 22, color: c.houseInk },
  author: { fontFamily: fonts.body, fontSize: 10, color: c.houseInk, opacity: 0.7 },
  ribbon: { position: "absolute", bottom: 8, right: 6, backgroundColor: c.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ribbonText: { fontFamily: fonts.bodyBold, fontSize: 9, color: c.onError },
}));
