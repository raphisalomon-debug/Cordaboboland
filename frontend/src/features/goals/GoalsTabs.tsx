// Objectifs et trophées partagent la même maison : un petit interrupteur pour passer de l'un à l'autre.
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { fonts, makeStyles } from "@/src/theme";

export function GoalsTabs({ current }: { current: "objectifs" | "trophees" }) {
  const styles = useStyles();
  const router = useRouter();
  const tabs = [
    { key: "objectifs", label: "Objectifs", href: "/objectifs" },
    { key: "trophees", label: "Trophées", href: "/trophees" },
  ] as const;
  return (
    <View style={styles.wrap}>
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          testID={`goals-tab-${t.key}`}
          style={[styles.tab, current === t.key && styles.on]}
          onPress={() => current !== t.key && router.replace(t.href)}
        >
          <Text style={[styles.text, current === t.key && styles.textOn]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  on: { backgroundColor: c.brandPrimary },
  text: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurfaceSecondary },
  textOn: { color: c.onBrandPrimary },
}));
