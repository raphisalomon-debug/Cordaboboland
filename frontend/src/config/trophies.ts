// =====================================================================
//  TROPHÉES disponibles quand un objectif est accompli
// =====================================================================
// `icon` = nom d'icône Material Design Icons (https://pictogrammers.com/library/mdi/)
// Ajouter / retirer un trophée = modifier cette liste.

export type TrophyDef = { key: string; label: string; icon: string; tint: string };

export const TROPHIES: TrophyDef[] = [
  { key: "coupe", label: "Coupe", icon: "trophy", tint: "#F2D7B6" },
  { key: "medaille", label: "Médaille", icon: "medal", tint: "#FAEDCD" },
  { key: "couronne", label: "Couronne", icon: "crown", tint: "#F6E3A8" },
  { key: "coeur", label: "Cœurs", icon: "heart-multiple", tint: "#F6C6C6" },
  { key: "diamant", label: "Diamant", icon: "diamond-stone", tint: "#C9DDF0" },
  { key: "fusee", label: "Fusée", icon: "rocket-launch", tint: "#E3D3EE" },
  { key: "fleur", label: "Fleur", icon: "flower-tulip", tint: "#F8D8E4" },
  { key: "maison", label: "Maison", icon: "home-heart", tint: "#EBD9C6" },
  { key: "voyage", label: "Voyage", icon: "airplane", tint: "#D6DDF0" },
  { key: "gateau", label: "Gâteau", icon: "cake-variant", tint: "#F6D5C8" },
  { key: "plage", label: "Vacances", icon: "palm-tree", tint: "#CCD5AE" },
  { key: "tirelire", label: "Économies", icon: "piggy-bank", tint: "#F8D8E4" },
];

export const trophyByKey = (key?: string | null) => TROPHIES.find((t) => t.key === key) ?? TROPHIES[0];
