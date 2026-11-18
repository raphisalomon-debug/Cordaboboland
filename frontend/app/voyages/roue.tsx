// Roue « on part où ? » : tire au hasard parmi les envies pas encore réalisées.
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Paper } from "@/src/components/Paper";
import { useToast } from "@/src/components/Toast";
import { Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useOverview, useVoyageActions } from "@/src/features/voyages/api";
import { flag, nameOf } from "@/src/features/voyages/geo";
import { fonts, makeStyles } from "@/src/theme";

export default function RoueScreen() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { data } = useOverview();
  const a = useVoyageActions();
  const [shown, setShown] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const visited = new Set((data?.visited ?? []).map((v) => v.code));
  const pool = [...new Set((data?.wishes ?? []).map((w) => w.code))].filter((c) => !visited.has(c));

  const spin = () => {
    if (pool.length === 0 || spinning) return;
    setSpinning(true);
    const final = pool[Math.floor(Math.random() * pool.length)];
    let step = 0;
    const total = 16;
    const tick = () => {
      step += 1;
      if (step >= total) {
        setShown(final);
        setSpinning(false);
        return;
      }
      setShown(pool[Math.floor(Math.random() * pool.length)]);
      timer.current = setTimeout(tick, 70 + step * 14);
    };
    tick();
  };

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title="On part où ?" testID="roue-header" />
      {!data ? (
        <Loading />
      ) : pool.length === 0 ? (
        <Text style={styles.empty} testID="roue-empty">Ajoutez d'abord des pays que vous avez envie de visiter 💭</Text>
      ) : (
        <View style={styles.body}>
          <View style={styles.slot} testID="roue-slot">
            <Text style={styles.flag}>{shown ? flag(shown) : "🌍"}</Text>
            <Text style={styles.name}>{shown ? nameOf(shown) : "?"}</Text>
          </View>
          <SketchButton testID="roue-spin" label={shown ? "Relancer" : "Tirer au sort"} icon="shuffle" onPress={spin} disabled={spinning} />
          {shown && !spinning && (
            <>
              <SketchButton
                testID="roue-choose"
                label="C'est là qu'on va !"
                icon="send"
                variant="secondary"
                onPress={() => a.setTrip.mutate({ code: shown, date: "", title: "" }, { onSuccess: () => { toast("Prochain voyage choisi ✈️"); router.replace({ pathname: "/voyages/pays", params: { code: shown } }); }, onError: (e: Error) => toast(e.message) })}
              />
              <Text style={styles.hint}>{pool.length} destination{pool.length > 1 ? "s" : ""} en réserve</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  body: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  slot: { alignItems: "center", gap: 8, paddingVertical: 36, borderRadius: 20, borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary },
  flag: { fontSize: 80 },
  name: { fontFamily: fonts.hand, fontSize: 36, color: c.onSurface, textAlign: "center" },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, textAlign: "center" },
  empty: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, textAlign: "center", padding: 32 },
}));
