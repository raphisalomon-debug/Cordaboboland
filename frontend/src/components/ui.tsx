// Shared hand-drawn UI bits: header, buttons, empty state, inputs.
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, useTheme } from "@/src/theme";

export function ScreenHeader({ title, right, testID }: { title: string; right?: ReactNode; testID?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]} testID={testID}>
      <Pressable
        testID="header-back-button"
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Feather name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  testID,
  badge,
}: {
  icon: string;
  onPress: () => void;
  testID: string;
  badge?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
      <Feather name={icon as any} size={20} color={colors.onSurface} />
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SketchButton({
  label,
  onPress,
  testID,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.brandTertiary,
    ghost: "transparent",
    danger: colors.error,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onBrandTertiary,
    ghost: colors.onSurface,
    danger: colors.onError,
  }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Feather name={icon as any} size={18} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function EmptyState({ icon, title, text, testID }: { icon: string; title: string; text: string; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyCircle}>
        <Feather name={icon as any} size={30} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: { flex: 1, fontFamily: fonts.hand, fontSize: 34, color: c.onSurface },
  right: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: c.error,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: c.onError, fontFamily: fonts.bodyBold, fontSize: 11 },
  btn: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.hand, fontSize: 22, color: c.onSurface },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.onSurface,
    backgroundColor: c.surface,
  },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: fonts.hand, fontSize: 28, color: c.onSurface, textAlign: "center" },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textAlign: "center" },
}));
