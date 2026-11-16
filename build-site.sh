#!/usr/bin/env bash
# Reconstruit le site web (dossier site/) à partir du code de l'app.
# À relancer après chaque modification de frontend/, puis commit + push du dossier site/.
set -euo pipefail
cd "$(dirname "$0")"

cd frontend
[ -d node_modules ] || yarn install --ignore-scripts --non-interactive
rm -rf ../site
CI=1 npx expo export -p web --output-dir ../site
cd ..
node tools/inject-pwa.js
echo "Site prêt dans site/ ($(du -sh site | cut -f1))."
