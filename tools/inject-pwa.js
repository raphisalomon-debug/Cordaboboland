// Ajoute au index.html exporté par Expo les balises qui rendent le site installable sur iPhone.
// (Avec output "single", Expo génère lui-même index.html et ignore app/+html.tsx.)
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

html = html.replace('<html lang="en">', '<html lang="fr">');
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
);
html = html.replace(/<meta name="theme-color"[^>]*>\s*/g, "");
html = html.replace(/<link rel="icon"[^>]*>/g, "");

const head = `
    <meta name="theme-color" content="#F4F0E6">
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Petites maisons" />
    <script>
      // Nettoie un éventuel ancien service worker et ses caches (version précédente de l'app).
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          rs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
      }
      if (window.caches) {
        caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }).catch(function () {});
      }
    </script>
  `;
if (!html.includes("</head>")) throw new Error("index.html sans </head> : export inattendu");
html = html.replace("</head>", head + "</head>");
fs.writeFileSync(file, html);
console.log("PWA : balises ajoutées à site/index.html");
