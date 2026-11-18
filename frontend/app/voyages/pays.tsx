// Fiche d'un pays : statut (visité / envie), prochain voyage, souvenirs (photo + citation + épingle), idées.
import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fileSource } from "@/src/api";
import { Paper } from "@/src/components/Paper";
import { Sheet } from "@/src/components/Sheet";
import { useToast } from "@/src/components/Toast";
import { Loading, ScreenHeader, SketchButton } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { VISIT_COLORS, pickAndUploadPhoto, useCountry, useOverview, useVoyageActions } from "@/src/features/voyages/api";
import { COUNTRY_BY_CODE, daysUntil, flag, frDate, nameOf, parseFrDate } from "@/src/features/voyages/geo";
import { WorldMap } from "@/src/features/voyages/WorldMap";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const toFr = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

export default function PaysScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? "");
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const { data: overview } = useOverview();
  const { data } = useCountry(code);
  const a = useVoyageActions(code);
  const err = (e: Error) => toast(e.message);

  const [why, setWhy] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [idea, setIdea] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  // formulaire d'un souvenir
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  // formulaire du voyage
  const [tripTitle, setTripTitle] = useState("");
  const [tripDate, setTripDate] = useState("");

  const myWish = data?.wishes.find((w) => w.user_id === user?.id);
  const otherWish = data?.wishes.find((w) => w.user_id !== user?.id);
  useEffect(() => setWhy(myWish?.why ?? ""), [myWish?.why]);
  useEffect(() => setVisitDate(toFr(data?.visit?.visited_on ?? "")), [data?.visit?.visited_on]);

  if (!data || !overview || !COUNTRY_BY_CODE.has(code)) {
    return (
      <View style={styles.root}>
        <Paper />
        <ScreenHeader title="Fiche pays" testID="pays-header" />
        <Loading />
      </View>
    );
  }

  const visit = data.visit;
  const both = !!myWish && !!otherWish;
  const trip = overview.trip?.code === code ? overview.trip : null;
  const left = trip ? daysUntil(trip.date) : null;

  const saveDate = () => {
    if (!visit) return;
    const iso = parseFrDate(visitDate);
    if (iso === null) return toast("Date invalide : écris JJ/MM/AAAA");
    if (iso !== visit.visited_on) a.setVisit.mutate({ color: visit.color, visited_on: iso }, { onError: err });
  };

  const choosePhoto = async () => {
    setUploading(true);
    try {
      const r = await pickAndUploadPhoto(() => toast("Accès aux photos refusé"));
      if (r) setPhoto(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setUploading(false);
    }
  };

  const saveEntry = () => {
    const iso = parseFrDate(date);
    if (iso === null) return toast("Date invalide : écris JJ/MM/AAAA");
    a.addEntry.mutate(
      { text, place, date: iso, photo_path: photo?.path ?? null, pin },
      {
        onSuccess: () => {
          setEntryOpen(false);
          setText("");
          setPlace("");
          setDate("");
          setPhoto(null);
          setPin(null);
          toast("Souvenir ajouté 📸");
        },
        onError: err,
      },
    );
  };

  const saveTrip = () => {
    const iso = parseFrDate(tripDate);
    if (iso === null) return toast("Date invalide : écris JJ/MM/AAAA");
    a.setTrip.mutate(
      { code, date: iso, title: tripTitle },
      { onSuccess: () => { setTripOpen(false); toast("Prochain voyage enregistré ✈️"); }, onError: err },
    );
  };

  return (
    <View style={styles.root}>
      <Paper />
      <ScreenHeader title={`${flag(code)} ${nameOf(code)}`} testID="pays-header" />
      <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        <WorldMap overview={overview} height={170} focusCode={code} focusScale={5} selectedCode={code} testID="pays-map" />

        {/* Statut */}
        {visit ? (
          <View style={styles.card} testID="pays-visited">
            <Text style={styles.cardTitle}>On y est allé 🎉</Text>
            <View style={styles.swatches}>
              {VISIT_COLORS.map((col) => (
                <Pressable
                  key={col}
                  onPress={() => a.setVisit.mutate({ color: col, visited_on: visit.visited_on }, { onError: err })}
                  style={[styles.swatch, { backgroundColor: col }, visit.color === col && styles.swatchOn]}
                >
                  {visit.color === col && <Feather name="check" size={16} color="#2B2824" />}
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="pays-visit-date"
              style={styles.input}
              value={visitDate}
              onChangeText={setVisitDate}
              onBlur={saveDate}
              onSubmitEditing={saveDate}
              placeholder="Date du voyage (JJ/MM/AAAA)"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.link} onPress={() => a.clearVisit.mutate(undefined, { onError: err })} suppressHighlighting testID="pays-unvisit">
              Finalement, pas encore allé
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <SketchButton testID="pays-visit" label="On y est allé !" icon="map-pin" onPress={() => a.setVisit.mutate({ color: VISIT_COLORS[0] }, { onError: err })} />
          </View>
        )}

        {/* Envies */}
        <View style={styles.card} testID="pays-wishes">
          <Text style={styles.cardTitle}>{both ? "On le veut tous les deux ✨" : "Envie d'y aller 💭"}</Text>
          {myWish ? (
            <>
              <TextInput
                testID="pays-why"
                style={[styles.input, { minHeight: 64, textAlignVertical: "top" }]}
                value={why}
                onChangeText={setWhy}
                onBlur={() => why !== myWish.why && a.setWish.mutate(why, { onError: err })}
                placeholder="Pourquoi tu as envie d'y aller ?"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={200}
              />
              <Text style={styles.link} onPress={() => a.clearWish.mutate(undefined, { onError: err })} suppressHighlighting testID="pays-unwish">
                Retirer mon envie
              </Text>
            </>
          ) : (
            <SketchButton testID="pays-wish" label="J'ai envie d'y aller" icon="heart" variant="secondary" onPress={() => a.setWish.mutate("", { onError: err })} />
          )}
          {otherWish && (
            <Text style={styles.quote}>
              {otherWish.user_name} : {otherWish.why ? `« ${otherWish.why} »` : "a envie d'y aller"}
            </Text>
          )}
        </View>

        {/* Prochain voyage */}
        <View style={styles.card} testID="pays-trip">
          {trip ? (
            <>
              <Text style={styles.cardTitle}>✈️ {trip.title || "Notre prochain voyage"}</Text>
              <Text style={styles.cardSub}>
                {left === null ? "Date à fixer" : left > 1 ? `Dans ${left} jours · ${frDate(trip.date)}` : left === 1 ? "Demain !" : left === 0 ? "C'est aujourd'hui !" : `Parti il y a ${-left} jours`}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <SketchButton testID="pays-trip-edit" label="Modifier" variant="secondary" onPress={() => { setTripTitle(trip.title); setTripDate(toFr(trip.date)); setTripOpen(true); }} style={{ flex: 1 }} />
                <SketchButton testID="pays-trip-clear" label="Retirer" variant="ghost" onPress={() => a.clearTrip.mutate(undefined, { onError: err })} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <SketchButton testID="pays-trip-set" label="C'est notre prochain voyage" icon="send" variant="secondary" onPress={() => { setTripTitle(""); setTripDate(""); setTripOpen(true); }} />
          )}
        </View>

        {/* Souvenirs */}
        <Text style={styles.section}>Souvenirs</Text>
        <SketchButton testID="pays-add-entry" label="Ajouter un souvenir" icon="camera" onPress={() => setEntryOpen(true)} />
        {data.entries.length === 0 && <Text style={styles.hint}>Photos, citations, lieux… tout ce dont vous voulez vous souvenir.</Text>}
        {data.entries.map((e) => (
          <View key={e.id} style={styles.entry} testID={`entry-${e.id}`}>
            {e.photo_path && <Image source={fileSource(e.photo_path)} style={styles.photo} contentFit="cover" />}
            {!!e.text && <Text style={styles.entryText}>« {e.text} »</Text>}
            <View style={styles.entryMeta}>
              <Text style={styles.entryInfo}>
                {e.pin ? "📍 " : ""}
                {[e.place, frDate(e.date)].filter(Boolean).join(" · ") || "—"} · {e.author_name}
              </Text>
              {e.author_id === user?.id && (
                <Pressable hitSlop={10} onPress={() => a.deleteEntry.mutate(e.id, { onError: err })} testID={`entry-delete-${e.id}`}>
                  <Feather name="trash-2" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {/* Idées */}
        <Text style={styles.section}>Idées</Text>
        {data.ideas.map((i) => (
          <View key={i.id} style={styles.idea} testID={`idea-${i.id}`}>
            <Pressable onPress={() => a.toggleIdea.mutate({ id: i.id, done: !i.done })} hitSlop={8} testID={`idea-toggle-${i.id}`}>
              <Feather name={i.done ? "check-square" : "square"} size={22} color={i.done ? colors.success : colors.muted} />
            </Pressable>
            <Text style={[styles.ideaText, i.done && { textDecorationLine: "line-through", color: colors.muted }]}>{i.text}</Text>
            <Pressable onPress={() => a.deleteIdea.mutate(i.id)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.ideaAdd}>
          <TextInput
            testID="pays-idea-input"
            style={[styles.input, { flex: 1 }]}
            value={idea}
            onChangeText={setIdea}
            placeholder="Une chose à y faire ou à y manger…"
            placeholderTextColor={colors.muted}
            onSubmitEditing={() => idea.trim() && a.addIdea.mutate(idea, { onSuccess: () => setIdea(""), onError: err })}
            returnKeyType="done"
            maxLength={120}
          />
          <Pressable
            style={styles.addBtn}
            testID="pays-idea-add"
            onPress={() => idea.trim() && a.addIdea.mutate(idea, { onSuccess: () => setIdea(""), onError: err })}
          >
            <Feather name="plus" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {/* Nouveau souvenir */}
      <Sheet visible={entryOpen} onClose={() => setEntryOpen(false)} title="Nouveau souvenir" testID="entry-sheet">
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          {photo ? (
            <Pressable onPress={choosePhoto}>
              <Image source={{ uri: photo.preview }} style={styles.photoPreview} contentFit="cover" />
            </Pressable>
          ) : (
            <SketchButton testID="entry-photo" label="Choisir une photo" icon="image" variant="secondary" onPress={choosePhoto} loading={uploading} />
          )}
          <TextInput testID="entry-text" style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]} value={text} onChangeText={setText} placeholder="Une citation, un petit mot…" placeholderTextColor={colors.muted} multiline maxLength={300} />
          <TextInput testID="entry-place" style={styles.input} value={place} onChangeText={setPlace} placeholder="Le lieu (ville, endroit…)" placeholderTextColor={colors.muted} maxLength={80} />
          <TextInput testID="entry-date" style={styles.input} value={date} onChangeText={setDate} placeholder="Date (JJ/MM/AAAA)" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
          <SketchButton
            testID="entry-pin"
            label={pin ? "Épingle posée ✓ (changer)" : "Poser une épingle sur la carte"}
            icon="map-pin"
            variant="secondary"
            onPress={() => { setEntryOpen(false); setPinOpen(true); }}
          />
          <SketchButton testID="entry-save" label="Enregistrer le souvenir" onPress={saveEntry} loading={a.addEntry.isPending} />
        </ScrollView>
      </Sheet>

      {/* Poser l'épingle */}
      <Sheet visible={pinOpen} onClose={() => { setPinOpen(false); setEntryOpen(true); }} title="Où exactement ?" testID="pin-sheet">
        <View style={{ gap: 12 }}>
          <Text style={styles.hint}>Zoome puis touche l'endroit précis.</Text>
          <WorldMap overview={overview} height={300} focusCode={code} focusScale={6} placing onPlace={(x, y) => setPin({ x, y })} placed={pin} testID="pin-map" />
          <SketchButton testID="pin-done" label={pin ? "Valider l'épingle" : "Retour"} onPress={() => { setPinOpen(false); setEntryOpen(true); }} />
        </View>
      </Sheet>

      {/* Prochain voyage */}
      <Sheet visible={tripOpen} onClose={() => setTripOpen(false)} title="Notre prochain voyage" testID="trip-sheet">
        <View style={{ gap: 12 }}>
          <TextInput testID="trip-title" style={styles.input} value={tripTitle} onChangeText={setTripTitle} placeholder="Un nom (ex. Hanami)" placeholderTextColor={colors.muted} maxLength={60} />
          <TextInput testID="trip-date" style={styles.input} value={tripDate} onChangeText={setTripDate} placeholder="Date de départ (JJ/MM/AAAA)" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
          <SketchButton testID="trip-save" label="Enregistrer" icon="send" onPress={saveTrip} loading={a.setTrip.isPending} />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  card: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  cardTitle: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface },
  cardSub: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  section: { fontFamily: fonts.hand, fontSize: 30, color: c.onSurface, marginTop: 6 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  swatchOn: { borderWidth: 3, borderColor: c.onSurface },
  input: { fontFamily: fonts.body, fontSize: 16, color: c.onSurface, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 10 },
  link: { fontFamily: fonts.body, fontSize: 14, color: c.muted, textDecorationLine: "underline", textAlign: "center", padding: 4 },
  quote: { fontFamily: fonts.hand, fontSize: 22, color: c.onSurfaceSecondary },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, textAlign: "center" },
  entry: { padding: 12, gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12 },
  photoPreview: { width: "100%", height: 180, borderRadius: 12 },
  entryText: { fontFamily: fonts.hand, fontSize: 26, color: c.onSurface, textAlign: "center" },
  entryMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  entryInfo: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: c.muted },
  idea: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  ideaText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.onSurface },
  ideaAdd: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
