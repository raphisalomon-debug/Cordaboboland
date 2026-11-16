// =====================================================================
//  EMPLACEMENTS D'IMAGES (faciles à remplacer)
// =====================================================================
// Déposez vos PNG à fond transparent dans frontend/assets/images/...
// puis remplacez `null` par `require("../../assets/images/....png")`.
// Tant qu'une valeur est `null`, un dessin placeholder est affiché.
//
// Les images des maisons peuvent aussi être changées depuis l'app
// (Réglages > Changer l'image) : l'image envoyée passe alors devant
// celle définie ici.

import type { ImageSource } from "expo-image";

/** Logo affiché en haut de l'accueil et sur la connexion. */
export const LOGO_IMAGE: ImageSource | number | null = require("../../assets/images/otter/logo.png");

/** Écran de chargement : loutre yeux fermés + image du clin d'œil (animation). */
export const LOADING_IMAGE: ImageSource | number | null = require("../../assets/images/otter/idle.png");
export const LOADING_WINK_IMAGE: ImageSource | number | null = require("../../assets/images/otter/wink.png");

/** Une image par maison (clé = `key` de backend/houses_config.py). */
export const HOUSE_IMAGES: Record<string, ImageSource | number | null> = {
  // Vos dessins sont gardés dans assets/images/houses/ si vous voulez les remettre :
  // ex : avent: require("../../assets/images/houses/avent.png"),
  avent: null,
  photos: null,
  dates: null,
  loutres: null,
  objectifs: null,
  trophees: null,
  versets: null,
  librairie: null,
};
