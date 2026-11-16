import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { View } from "react-native";

import { trophyByKey } from "@/src/config/trophies";
import { useTheme } from "@/src/theme";

export function TrophyIcon({ trophy, size }: { trophy?: string | null; size: number }) {
  const { colors } = useTheme();
  const t = trophyByKey(trophy);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.tint,
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialDesignIcons name={t.icon as any} size={size * 0.55} color={colors.houseInk} />
    </View>
  );
}
