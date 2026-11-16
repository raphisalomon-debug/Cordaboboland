"""
=====================================================================
  CONFIGURATION DES MAISONS  (fichier unique)
=====================================================================
Chaque maison de l'écran d'accueil est décrite ici. Au démarrage, les
maisons absentes de la base sont ajoutées automatiquement ; ensuite
tout se règle depuis la page "Réglages" de l'app (nom, visibilité,
position, image, lien).

Champs :
  key     identifiant unique (ne pas changer une fois créé)
  name    petit nom écrit sous la maison
  action  "link" = ouvre un lien externe   |  "page" = ouvre une page de l'app
  target  l'URL (action link) ou la route de la page (action page, ex "/dates")
  x, y    position sur la feuille, de 0 à 1 (0.5 = milieu)
  visible True / False
  color   couleur pastel de la maison dessinée (placeholder)
  order   ordre du petit chemin qui relie les maisons

Ajouter une fonctionnalité :
  1. créer la page frontend/app/<route>.tsx (+ son dossier dans src/features)
  2. ajouter une entrée ici avec action "page" et target "/<route>"
Retirer une maison : passer visible à False dans les Réglages
(ou supprimer l'entrée ici + dans la base).
"""

HOUSES = [
    {"key": "avent", "name": "Calendrier de l'avent", "action": "link",
     "target": "https://www.littlecalendars.com/c/cheery-comet-4kczb3vn2v", "x": 0.27, "y": 0.11, "visible": True,
     "color": "#F6C6C6", "order": 1},
    {"key": "photos", "name": "Photos", "action": "link",
     "target": "https://drive.google.com/drive/u/0/folders/19XQOFS62HXzGwYvqhML1rqMQrupkDW9n", "x": 0.73, "y": 0.22, "visible": True,
     "color": "#C9DDF0", "order": 2},
    {"key": "dates", "name": "Nos dates", "action": "page",
     "target": "/dates", "x": 0.27, "y": 0.33, "visible": True,
     "color": "#FAEDCD", "order": 3},
    {"key": "objectifs", "name": "Objectifs et trophées", "action": "page",
     "target": "/objectifs", "x": 0.27, "y": 0.56, "visible": True,
     "color": "#E3D3EE", "order": 4},
    {"key": "versets", "name": "Nos versets", "action": "page",
     "target": "/versets", "x": 0.27, "y": 0.78, "visible": True,
     "color": "#D6E5D8", "order": 6},
    {"key": "librairie", "name": "Librairie", "action": "page",
     "target": "/librairie", "x": 0.73, "y": 0.89, "visible": True,
     "color": "#F8D8E4", "order": 7},
    {"key": "cemantix", "name": "Cémantix", "action": "page",
     "target": "/cemantix", "x": 0.27, "y": 0.95, "visible": True,
     "color": "#FBE7A1", "order": 8},
    {"key": "voyages", "name": "Nos voyages", "action": "page",
     "target": "/voyages", "x": 0.73, "y": 0.93, "visible": True,
     "color": "#C9DDF0", "order": 10},
    {"key": "fleuriste", "name": "Fleuriste", "action": "page",
     "target": "/fleuriste", "x": 0.27, "y": 0.8, "visible": True,
     "color": "#F4C2D7", "order": 11},
]

# Maisons supprimées de l'app (effacées de la base au démarrage).
REMOVED_HOUSES = ["loutres", "trophees"]

# Maisons renommées : {clé: (ancien nom, nouveau nom)} ; appliqué seulement si le nom n'a pas été changé dans l'app.
RENAMED_HOUSES = {"objectifs": ("Objectifs", "Objectifs et trophées")}
