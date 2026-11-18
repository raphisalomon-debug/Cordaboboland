import fs from "fs";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath, geoArea, geoContains } from "d3-geo";
import { countries as CL } from "countries-list";
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
  // centroïde du plus gros morceau (la France métropolitaine, pas la Guyane) ; repère de la carte
  let big = f;
  if (f.geometry.type === "MultiPolygon") {
    let best = -1;
    for (const c of f.geometry.coordinates) {
      const part = { type: "Feature", geometry: { type: "Polygon", coordinates: c } };
      const a = geoArea(part);
      if (a > best) { best = a; big = part; }
    }
  }
  const [cx, cy] = path.centroid(big);
  const continent = { XK: "EU", "CY-N": "AS", "SO-SL": "AF" }[code] || CL[code]?.continent || "";
  out.push({ code, name, d, c: [Math.round(cx), Math.round(cy)], k: continent });
}
const b = geoPath(proj).bounds({ type: "FeatureCollection", features: feats });
H = Math.ceil(b[1][1] + 2);
out.sort((a, c) => a.name.localeCompare(c.name, "fr"));
// Vagues décoratives dans les océans (jamais sur une terre)
const land = (x, y) => { const p = proj.invert([x, y]); return !p || feats.some(f => geoContains(f, p)); };
const waves = [];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let y = 30; y < H - 20; y += 38) for (let x = 20; x < W - 20; x += 46) {
  const px = x + (rnd() - 0.5) * 30, py = y + (rnd() - 0.5) * 22;
  const ok = [[0,0],[14,0],[-14,0],[0,10],[0,-10]].every(([dx, dy]) => { const p = proj.invert([px + dx, py + dy]); return p && !feats.some(f => geoContains(f, p)); });
  if (ok && proj.invert([px, py])) waves.push([Math.round(px), Math.round(py), +(0.8 + rnd() * 0.6).toFixed(2)]);
}
const body = `// Généré automatiquement (voir tools/geo/README) : fond de carte Natural Earth (domaine public) via world-atlas.\n// Chaque pays : code (ISO alpha-2), nom français et tracé SVG dans un repère de ${W} x ${H}.\nexport const WORLD_W = ${W};\nexport const WORLD_H = ${H};\n// c = centre du pays sur la carte, k = continent (AF AS EU NA SA OC)\n// WAVES = [x, y, taille] des vagues dessinées sur les océans\nexport const WAVES: [number, number, number][] = ${JSON.stringify(waves)};\nexport const COUNTRIES: { code: string; name: string; d: string; c: [number, number]; k: string }[] = ${JSON.stringify(out)};\n`;
fs.writeFileSync("world.ts", body);
console.log(out.length, "pays,", (body.length / 1024).toFixed(0), "Ko, hauteur", H);
