// Bottom sheet (Modal) with keyboard handling. Mounted by each screen at root level.
import { ReactNode } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles } from "@/src/theme";

export function Sheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID: string;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} testID={`${testID}-backdrop`} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} testID={testID}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: c.surfaceInverse, opacity: 0.35 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
    maxHeight: "90%",
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  title: { fontFamily: fonts.hand, fontSize: 30, color: c.onSurface },
}));
