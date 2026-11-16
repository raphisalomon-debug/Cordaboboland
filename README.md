# Nos petites maisons

Application privée pour deux, en site web installable sur iPhone (PWA).
Tout est gratuit et ne dépend d'aucun outil d'IA : un seul service qui sert le site **et** l'API,
une base MongoDB, et ce dépôt GitHub qui contient tout le code.

```
backend/    API (FastAPI + MongoDB) — sert aussi le site
frontend/   Code de l'app (Expo / React Native Web)
site/       Le site déjà construit (c'est ce que Render met en ligne)
tools/      Petit script qui ajoute les réglages iPhone au site
render.yaml Configuration du déploiement gratuit
docs/PRD.md Historique de ce qui a été construit
```

## Mise en ligne (≈ 20 minutes, une seule fois)

### 1. Le code sur GitHub
Crée un compte sur github.com, un **nouveau dépôt privé** `nos-petites-maisons`, puis envoie-y tout le contenu de ce dossier
(bouton « uploading an existing file » sur la page du dépôt, ou `git push`). Le fichier `.env` n'est jamais envoyé.

### 2. La base de données (MongoDB Atlas, gratuit)
1. Compte sur mongodb.com/atlas → créer un cluster **M0 (Free)**, région **Frankfurt (AWS)**.
2. *Database Access* : crée un utilisateur (nom + mot de passe) avec le droit « Read and write to any database ».
3. *Network Access* : ajoute l'adresse `0.0.0.0/0` (Render n'a pas d'adresse fixe en gratuit).
4. *Connect → Drivers* : copie l'adresse `mongodb+srv://…` et remplace `<password>` par ton mot de passe.

### 3. Le serveur (Render, gratuit)
1. Compte sur render.com → **New → Blueprint** → choisis ton dépôt GitHub. Render lit `render.yaml`.
2. Il te demande les valeurs secrètes :
   - `MONGO_URL` : l'adresse copiée à l'étape 2
   - `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` : ton compte (il ouvre les Réglages)
   - `PARTNER_EMAIL`, `PARTNER_NAME`, `PARTNER_PASSWORD` : son compte
3. Lance. Après quelques minutes tu obtiens une adresse `https://nos-petites-maisons-xxxx.onrender.com`.

Les deux comptes sont créés automatiquement au démarrage. Pour changer un mot de passe : modifie la valeur dans Render (*Environment*) et redémarre.

### 4. L'installer sur l'iPhone
Ouvre l'adresse **dans Safari** → bouton Partager → **Sur l'écran d'accueil**. L'app a alors son icône et s'ouvre en plein écran.
(Ça ne marche pas depuis Chrome sur iPhone : il faut Safari.)

## À savoir
- **Réveil** : en gratuit, Render endort le service après 15 min sans visite ; la première ouverture prend alors environ 1 minute.
  Pour l'éviter, un service de ping gratuit (UptimeRobot, par exemple) qui visite `/health` toutes les 5 à 10 minutes le garde éveillé.
  Un service tourne en continu ≈ 744 h/mois, sous les 750 h gratuites.
- **Données** : tout est dans MongoDB Atlas (images des maisons comprises). Atlas propose des sauvegardes et des exports (`mongodump`) ;
  pense à en faire un de temps en temps.

## Modifier l'app
Après un changement dans `frontend/`, reconstruis le site puis renvoie-le sur GitHub (Render redéploie tout seul) :

```bash
./build-site.sh     # nécessite Node 20+ et yarn
```

Un changement dans `backend/` n'a pas besoin de cette étape.
Si tu changes les fichiers du site et que l'iPhone garde l'ancienne version, augmente `VERSION` dans `frontend/public/sw.js`.

## Tourner en local
```bash
cd backend && cp .env.example .env     # puis remplis-le
pip install -r requirements.txt
uvicorn server:app --port 8001         # http://localhost:8001
```
