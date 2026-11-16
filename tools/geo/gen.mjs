import fs from "fs";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { presimplify, simplify, quantile } from "topojson-simplify";
import iso from "i18n-iso-countries";
let topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.35));
const fc = feature(topo, topo.objects.countries);
const fr = new Intl.DisplayNames(["fr"], { type: "region" });
const W = 1000;
const feats = fc.features.filter(f => f.properties.name !== "Antarctica");
const proj = geoNaturalEarth1().fitWidth(W, { type: "FeatureCollection", features: feats });
const path = geoPath(proj).digits(1);
const special = { Kosovo: ["XK", "Kosovo"], "N. Cyprus": ["CY-N", "Chypre du Nord"], Somaliland: ["SO-SL", "Somaliland"] };
const out = []; let H = 0;
for (const f of feats) {
  const d = path(f); if (!d) continue;
  if (["Indian Ocean Ter.","Siachen Glacier"].includes(f.properties.name)) continue;
  const n = f.properties.name;
  let code, name;
  if (special[n]) [code, name] = special[n];
  else {
    code = iso.numericToAlpha2(String(f.id).padStart(3, "0"));
    if (!code) { console.log("no code", n, f.id); code = "X-" + n.replace(/\W/g, ""); }
    try { name = fr.of(code); } catch { name = n; }
    if (!name || name === code) name = n;
  }
  out.push({ code, name, d });
}
const b = geoPath(proj).bounds({ type: "FeatureCollection", features: feats });
H = Math.ceil(b[1][1] + 2);
out.sort((a, c) => a.name.localeCompare(c.name, "fr"));
const body = `// Généré automatiquement (voir tools/geo/README) : fond de carte Natural Earth (domaine public) via world-atlas.\n// Chaque pays : code (ISO alpha-2), nom français et tracé SVG dans un repère de ${W} x ${H}.\nexport const WORLD_W = ${W};\nexport const WORLD_H = ${H};\nexport const COUNTRIES: { code: string; name: string; d: string }[] = ${JSON.stringify(out)};\n`;
fs.writeFileSync("world.ts", body);
console.log(out.length, "pays,", (body.length / 1024).toFixed(0), "Ko, hauteur", H);
