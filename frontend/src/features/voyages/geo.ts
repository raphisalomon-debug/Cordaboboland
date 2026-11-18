// Petits outils autour des pays : drapeaux, statistiques, trophées du voyage, dates.
import dayjs from "dayjs";

import { Overview } from "@/src/features/voyages/api";
import { COUNTRIES } from "@/src/features/voyages/world";

export type Country = (typeof COUNTRIES)[number];
export const COUNTRY_BY_CODE = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));
export const CONTINENTS: Record<string, string> = { AF: "Afrique", AS: "Asie", EU: "Europe", NA: "Amérique du Nord", SA: "Amérique du Sud", OC: "Océanie" };
export const HOME_CODE = "CH"; // d'où partent les voyages

export const nameOf = (code: string) => COUNTRY_BY_CODE.get(code)?.name ?? code;

/** Drapeau en emoji (🇨🇭) ; un petit drapeau blanc pour les territoires sans code à deux lettres. */
export function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((ch) => 127397 + ch.charCodeAt(0)));
}

export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "25/12/2026" -> "2026-12-25" ; "" -> "" ; null si invalide
export function parseFrDate(v: string): string | null {
  if (!v.trim()) return "";
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dayjs(iso).format("YYYY-MM-DD") === iso ? iso : null;
}
export const frDate = (iso: string) => (iso ? dayjs(iso).locale("fr").format("D MMM YYYY") : "");

/** Pays dont les deux ont envie (une envie de chacun, et pas encore visité). */
export function sharedWishes(o: Overview): string[] {
  const by = new Map<string, Set<string>>();
  for (const w of o.wishes) by.set(w.code, (by.get(w.code) ?? new Set()).add(w.user_id));
  return [...by.entries()].filter(([, s]) => s.size >= 2).map(([c]) => c);
}

export function worldStats(o: Overview) {
  const visited = o.visited.map((v) => v.code);
  const continents = new Set(visited.map((c) => COUNTRY_BY_CODE.get(c)?.k).filter(Boolean) as string[]);
  const wished = [...new Set(o.wishes.map((w) => w.code))].filter((c) => !visited.includes(c));
  return {
    countries: visited.length,
    continents: continents.size,
    percent: Math.min(100, Math.round((visited.length / 195) * 100)),
    wished,
    shared: sharedWishes(o).filter((c) => !visited.includes(c)),
    memories: Object.values(o.memories).reduce((a, b) => a + b, 0),
  };
}

export type Achievement = { key: string; emoji: string; title: string; desc: string; value: number; goal: number };

/** Trophées gagnés automatiquement selon la carte. */
export function achievements(o: Overview): Achievement[] {
  const s = worldStats(o);
  const A = (key: string, emoji: string, title: string, desc: string, value: number, goal: number): Achievement => ({ key, emoji, title, desc, value, goal });
  return [
    A("first", "🌱", "Premier pas", "Un premier pays visité", s.countries, 1),
    A("five", "🧳", "Globe-trotteurs", "5 pays visités", s.countries, 5),
    A("ten", "🌍", "Tour du monde", "10 pays visités", s.countries, 10),
    A("twentyfive", "🏆", "Grands voyageurs", "25 pays visités", s.countries, 25),
    A("c3", "🧭", "Trois continents", "Visiter 3 continents", s.continents, 3),
    A("c5", "🗺️", "Cinq continents", "Visiter 5 continents", s.continents, 5),
    A("dream", "💭", "Rêveurs", "5 pays sur la liste d'envies", s.wished.length, 5),
    A("both", "✨", "Même envie", "Un pays que vous voulez tous les deux", sharedWishes(o).length, 1),
    A("memory", "📸", "Premier souvenir", "Un souvenir ajouté", s.memories, 1),
    A("album", "📚", "Album de voyage", "10 souvenirs ajoutés", s.memories, 10),
  ];
}

/** Trait courbe de la Suisse vers le pays du prochain voyage, en coordonnées de la carte. */
export function arcPath(toCode: string): { d: string; mid: [number, number] } | null {
  const a = COUNTRY_BY_CODE.get(HOME_CODE)?.c;
  const b = COUNTRY_BY_CODE.get(toCode)?.c;
  if (!a || !b || toCode === HOME_CODE) return null;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cx = mx;
  const cy = my - dist * 0.3;
  const t = 0.5;
  const px = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0];
  const py = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1];
  return { d: `M${a[0]} ${a[1]} Q${cx} ${cy} ${b[0]} ${b[1]}`, mid: [px, py] };
}

export function daysUntil(iso: string): number | null {
  if (!iso) return null;
  return dayjs(iso).startOf("day").diff(dayjs().startOf("day"), "day");
}
