// Village seasons. Auto = from the month (northern hemisphere), or forced
// from Réglages (saved on this phone), like the day/night mode.
import { useSyncExternalStore } from "react";

import { storage } from "@/src/utils/storage";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type SeasonMode = "auto" | Season;

export const SEASON_LABELS: Record<SeasonMode, string> = {
  auto: "Auto",
  spring: "Printemps",
  summer: "Été",
  autumn: "Automne",
  winter: "Hiver",
};

const KEY = "season_mode";
let mode: SeasonMode = "auto";
const listeners = new Set<() => void>();

storage.getItem(KEY, "auto").then((m) => {
  if (typeof m === "string" && m in SEASON_LABELS) {
    mode = m as SeasonMode;
    listeners.forEach((l) => l());
  }
});

export function seasonFromDate(d = new Date()): Season {
  const m = d.getMonth();
  if (m === 11 || m <= 1) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

export function setSeasonMode(m: SeasonMode) {
  mode = m;
  storage.setItem(KEY, m);
  listeners.forEach((l) => l());
}

export function useSeason(): { mode: SeasonMode; season: Season } {
  const m = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mode,
    () => mode,
  );
  return { mode: m, season: m === "auto" ? seasonFromDate() : m };
}
