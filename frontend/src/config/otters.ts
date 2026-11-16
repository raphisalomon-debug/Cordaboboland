// =====================================================================
//  PALETTE DE LOUTRES
// =====================================================================
// Ajouter / retirer une loutre = modifier cette liste.
// `key` : identifiant (lettres minuscules, ne plus le changer une fois utilisé)
// `image` : remplacez null par require("../../assets/images/otters/xxx.png")
//           pour utiliser votre propre dessin à la place de l'emoji.

import type { ImageSource } from "expo-image";

export type OtterDef = {
  key: string;
  label: string;
  emoji: string; // placeholder tant qu'il n'y a pas d'image
  tint: string; // fond pastel du sticker
  image: ImageSource | number | null;
};

export const OTTERS: OtterDef[] = [
  { key: "calin", label: "Câline", emoji: "🤗", tint: "#F6D5C8", image: null },
  { key: "dodo", label: "Endormie", emoji: "😴", tint: "#D6DDF0", image: null },
  { key: "amour", label: "Amoureuse", emoji: "😍", tint: "#F6C6C6", image: null },
  { key: "joie", label: "Joyeuse", emoji: "😄", tint: "#FAEDCD", image: null },
  { key: "triste", label: "Triste", emoji: "🥺", tint: "#C9DDF0", image: null },
  { key: "faim", label: "Affamée", emoji: "🍣", tint: "#F2D7B6", image: null },
  { key: "boude", label: "Boudeuse", emoji: "😤", tint: "#E3D3EE", image: null },
  { key: "bisou", label: "Bisou", emoji: "😘", tint: "#F8D8E4", image: null },
  { key: "fiere", label: "Fière", emoji: "😎", tint: "#CCD5AE", image: null },
  { key: "manque", label: "Tu me manques", emoji: "💌", tint: "#EBD9C6", image: null },
];

export const otterByKey = (key: string) => OTTERS.find((o) => o.key === key) ?? OTTERS[0];
