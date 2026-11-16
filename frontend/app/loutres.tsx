// Loutres : boîte aux loutres + palette (aucun texte libre).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { FlatList, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { EmptyState, Loading, ScreenHeader } from "@/src/components/ui";
import { otterByKey, OTTERS } from "@/src/config/otters";
import { OtterSticker } from "@/src/features/otters/OtterSticker";
import { fonts, makeStyles } from "@/src/theme";

dayjs.locale("fr");

type OtterMsg = { id: string; otter_key: string; from_id: string; from_name: string; created_at: string; seen: boolean };

function when(iso: string) {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), "day")) return `aujourd'hui à ${d.format("HH:mm")}`;
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return `hier à ${d.format("HH:mm")}`;
  return d.format("D MMM à HH:mm");
}

export default function LoutresScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["otters"],
    queryFn: () => api<OtterMsg[]>("/otters"),
    refetchInterval: 10000,
  });

  // Opening the box marks received otters as seen.
  const hasUnread = (data ?? []).some((o) => o.from_id !== user?.id && !o.seen);
  useEffect(() => {
    if (!hasUnread) return;
    api("/otters/seen", { method: "POST" }).then(() => {
      qc.invalidateQueries({ queryKey: ["otters-unread"] });
      qc.invalidateQueries({ queryKey: ["otters"] });
    });
  }, [hasUnread, qc]);

  const send = useMutation({
    mutationFn: (key: string) => api("/otters", { method: "POST", body: { otter_key: key } }),
    onSuccess: (_, key) => {
      qc.invalidateQueries({ queryKey: ["otters"] });
      toast(`Loutre ${otterByKey(key).label.toLowerCase()} envoyée !`);
    },
    onError: (e: Error) => toast(e.message),
  });

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="Loutres" testID="loutres-header" />
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          inverted={(data ?? []).length > 0}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12, gap: 14, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState testID="loutres-empty" icon="inbox" title="La boîte est vide" text="Envoie ta première loutre pour dire coucou !" />
          }
          renderItem={({ item }) => {
            const mine = item.from_id === user?.id;
            const otter = otterByKey(item.otter_key);
            return (
              <View style={[styles.msg, mine ? styles.mine : styles.theirs]} testID={`otter-msg-${item.id}`}>
                <OtterSticker otter={otter} size={76} />
                <Text style={styles.msgLabel}>{otter.label}</Text>
                <Text style={styles.time}>
                  {mine ? "envoyée" : `de ${item.from_name}`} · {when(item.created_at)}
                </Text>
              </View>
            );
          }}
        />
      )}
      <View style={[styles.palette, { paddingBottom: insets.bottom + 12 }]} testID="otter-palette">
        <Text style={styles.paletteTitle}>Envoyer une loutre</Text>
        <View style={styles.grid}>
          {OTTERS.map((o) => (
            <Pressable
              key={o.key}
              testID={`send-otter-${o.key}`}
              disabled={send.isPending}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                send.mutate(o.key);
              }}
              style={({ pressed }) => [styles.cell, pressed && { transform: [{ scale: 0.9 }] }]}
            >
              <OtterSticker otter={o} size={48} />
              <Text style={styles.cellLabel} numberOfLines={1}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  msg: { alignItems: "center", gap: 2, maxWidth: 160 },
  mine: { alignSelf: "flex-end" },
  theirs: { alignSelf: "flex-start" },
  msgLabel: { fontFamily: fonts.hand, fontSize: 20, color: c.onSurface },
  time: { fontFamily: fonts.body, fontSize: 11, color: c.muted, textAlign: "center" },
  palette: {
    backgroundColor: c.surfaceSecondary,
    borderTopWidth: 1.5,
    borderColor: c.borderStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  paletteTitle: { fontFamily: fonts.hand, fontSize: 24, color: c.onSurface, marginLeft: 8, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "20%", alignItems: "center", paddingVertical: 6, gap: 2 },
  cellLabel: { fontFamily: fonts.body, fontSize: 10, color: c.onSurfaceSecondary },
}));
