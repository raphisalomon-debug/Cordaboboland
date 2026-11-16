// Design tokens — "Hand-drawn notebook".
// Two palettes: `light` = day (beige paper), `dark` = night (dark paper,
// street lamps lit). The app does NOT follow the phone's dark mode: it
// follows the clock (night from 20:00 to 07:00) unless the user forces
// "Jour" or "Nuit" from the sun/moon button (saved on the phone).
//
// Use `useTheme().colors` or `makeStyles(colors => ...)` in components.

import { useMemo, useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";

import { storage } from "@/src/utils/storage";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F4F0E6",
  onSurface: "#3E3A35",
  surfaceSecondary: "#EAE4D3",
  onSurfaceSecondary: "#3E3A35",
  surfaceTertiary: "#DFD8C4",
  onSurfaceTertiary: "#3E3A35",
  surfaceInverse: "#2C2A26",
  onSurfaceInverse: "#F4F0E6",
  muted: "#8B8476",

  brand: "#D4A373",
  onBrand: "#FFFFFF",
  brandPrimary: "#B5835A",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#CCD5AE",
  onBrandSecondary: "#2C2A26",
  brandTertiary: "#FAEDCD",
  onBrandTertiary: "#3E3A35",

  success: "#7F9468",
  onSuccess: "#FFFFFF",
  warning: "#E9C46A",
  onWarning: "#2C2A26",
  error: "#C8654B",
  onError: "#FFFFFF",
  info: "#81B29A",
  onInfo: "#FFFFFF",

  border: "#D1C7B1",
  borderStrong: "#AFA38D",
  divider: "#D1C7B1",

  // Notebook & village extras
  paperLine: "#D9CFB8",
  marginLine: "#E8B4A8",
  path: "#DCCDB0",
  pathEdge: "#B8A684",
  lampPost: "#7A6A58",
  lampGlass: "#E9E1CC",
  glow: "#FFD27A",
  houseInk: "#5A4A3C",
  houseWindow: "#F4F0E6",
  wood: "#C08F5F",
  woodDark: "#8A5E38",
  woodLight: "#D9AE80",
  star: "#F4F0E6",
  // nature
  leaf: "#A9C08C",
  leafDark: "#7F9468",
  trunk: "#9C7350",
  petalA: "#F6C6C6",
  petalB: "#E3D3EE",
  petalC: "#C9DDF0",
  petalCenter: "#E9C46A",
  fur: "#E2B07A",
  furLight: "#EFE7DA",
  furDark: "#8B7360",
  // seasons
  autumnA: "#E6A15C",
  autumnB: "#D9734E",
  autumnC: "#E9C46A",
  blossom: "#F8D8E4",
  snow: "#FFFFFF",
  heart: "#E26D6D",
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  surface: "#1E1C1A",
  onSurface: "#E6DFD3",
  surfaceSecondary: "#2A2724",
  onSurfaceSecondary: "#E6DFD3",
  surfaceTertiary: "#35322E",
  onSurfaceTertiary: "#E6DFD3",
  surfaceInverse: "#F4F0E6",
  onSurfaceInverse: "#1E1C1A",
  muted: "#948B7D",

  brand: "#FFB703",
  onBrand: "#3E3A35",
  brandPrimary: "#FFB703",
  onBrandPrimary: "#3E3A35",
  brandSecondary: "#7F6A59",
  onBrandSecondary: "#E6DFD3",
  brandTertiary: "#3B3329",
  onBrandTertiary: "#E6DFD3",

  success: "#6F8A62",
  onSuccess: "#FFFFFF",
  warning: "#FFB703",
  onWarning: "#3E3A35",
  error: "#C0614B",
  onError: "#FFFFFF",
  info: "#477260",
  onInfo: "#FFFFFF",

  border: "#3E3A35",
  borderStrong: "#5B564F",
  divider: "#3E3A35",

  paperLine: "#2D2A26",
  marginLine: "#4A3530",
  path: "#3A342D",
  pathEdge: "#574D41",
  lampPost: "#6B6359",
  lampGlass: "#FFE29A",
  glow: "#FFB703",
  houseInk: "#2A231D",
  houseWindow: "#FFD27A",
  wood: "#6E4E33",
  woodDark: "#4A3322",
  woodLight: "#8A6440",
  star: "#F7E7B4",
  leaf: "#3E5136",
  leafDark: "#2D3B27",
  trunk: "#4E3A2A",
  petalA: "#7A5560",
  petalB: "#5E5470",
  petalC: "#4C5E70",
  petalCenter: "#B8923F",
  fur: "#8C6A48",
  furLight: "#8E877B",
  furDark: "#4D4036",
  autumnA: "#7A5434",
  autumnB: "#6E3F2E",
  autumnC: "#7A6634",
  blossom: "#6E5561",
  snow: "#C9CDD6",
  heart: "#E26D6D",
};

export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

// Fonts (loaded in app/_layout.tsx)
export const fonts = {
  hand: "Caveat-Bold", // titres manuscrits
  body: "Nunito-Regular",
  bodyBold: "Nunito-Bold",
};

// ---------------------------------------------------------------------------
// Day / night store
// ---------------------------------------------------------------------------
export type NightMode = "auto" | "day" | "night";
const MODE_KEY = "night_mode";
let mode: NightMode = "auto";
const listeners = new Set<() => void>();

const isNightHour = () => {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
};
let hourNight = isNightHour();
let snapshot = `${mode}|${hourNight}`;

function emit() {
  snapshot = `${mode}|${hourNight}`;
  listeners.forEach((l) => l());
}

storage.getItem(MODE_KEY, "auto").then((m) => {
  if (m === "auto" || m === "day" || m === "night") {
    mode = m;
    emit();
  }
});

// Re-check the clock every minute so the village goes dark at 20:00.
setInterval(() => {
  const n = isNightHour();
  if (n !== hourNight) {
    hourNight = n;
    emit();
  }
}, 60_000);

export function setNightMode(m: NightMode) {
  mode = m;
  storage.setItem(MODE_KEY, m);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNightMode(): { mode: NightMode; isNight: boolean } {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  const [m, h] = snap.split("|") as [NightMode, string];
  return { mode: m, isNight: m === "night" || (m === "auto" && h === "true") };
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const { isNight } = useNightMode();
  const scheme: ColorScheme = isNight ? "dark" : "light";
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
