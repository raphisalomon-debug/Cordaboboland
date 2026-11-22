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
    <style>
      /* Confort iPhone : pas de zoom automatique dans les champs (16 px mini), pas de rebond de page, pas de flash gris au toucher. */
      input, textarea, select { font-size: 16px !important; }
      html, body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; touch-action: manipulation; }
      body { -webkit-touch-callout: none; }
      input, textarea { -webkit-touch-callout: default; -webkit-user-select: text; user-select: text; }
      /* Écran d'attente affiché tout de suite, avant même que l'app soit chargée. */
      #boot { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; font-family: "Caveat", "Bradley Hand", cursive; text-align: center; padding: 24px; }
      #boot b { font-size: 42px; font-weight: 700; }
      #boot small { font-family: -apple-system, system-ui, sans-serif; font-size: 13px; opacity: 0; transition: opacity .6s; max-width: 260px; }
      #boot small.on { opacity: .65; }
      #boot i { width: 26px; height: 26px; border-radius: 50%; border: 3px solid currentColor; border-top-color: transparent; opacity: .55; animation: bootspin 0.9s linear infinite; }
      @keyframes bootspin { to { transform: rotate(360deg); } }
    </style>
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
const boot = `
    <script>
      // Écran d'attente affiché tout de suite (ce script est placé après #root, il ne attend pas le gros fichier JS).
      (function () {
        var h = new Date().getHours(), night = h >= 20 || h < 7;
        var bg = night ? "#1E1C1A" : "#F4F0E6", fg = night ? "#F4F0E6" : "#2B2824";
        document.documentElement.style.background = bg;
        document.body.style.background = bg;
        var r = document.getElementById("root");
        if (!r || r.childNodes.length) return;
        r.innerHTML = '<div id="boot" style="background:' + bg + ';color:' + fg + '"><b>Cordaboboland</b><i></i><small>Le serveur se réveille, ça peut prendre jusqu\\'à une minute…</small></div>';
        setTimeout(function () { var s = document.querySelector("#boot small"); if (s) s.className = "on"; }, 6000);
      })();
    </script>
  `;
html = html.replace(/<div id="root"><\/div>/, (m) => m + boot);
fs.writeFileSync(file, html);
console.log("PWA : balises ajoutées à site/index.html");
