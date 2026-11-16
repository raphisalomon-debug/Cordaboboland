// Dessin des fleurs et des bouquets (SVG). Un même dessin sert à l'éditeur, à la liste et au bouquet.
import { useId } from "react";
import Svg, { ClipPath, Circle, Defs, G, Path } from "react-native-svg";

import { Flower, ShapeKey, Stroke } from "@/src/features/fleuriste/api";

const INK = "#5A4A3C";
const SHAPE_W: Record<ShapeKey, number> = { ronde: 0.8, ovale: 0.5, pointue: 0.55, coeur: 0.72, goutte: 0.62 };

/** Largeur d'une pétale de longueur L : elle s'affine quand il y en a beaucoup. */
export const petalWidth = (shape: ShapeKey, L: number, n: number) => L * SHAPE_W[shape] * Math.min(1, 8 / n);

/** Contour d'une pétale : base en (0,0), pointe en (0,-L). */
export function petalPath(shape: ShapeKey, L: number, W: number): string {
  const h = W / 2;
  const c = h / 0.75;
  const f = (n: number) => +n.toFixed(2);
  const P = (x: number, y: number) => `${f(x)} ${f(y)}`;
  switch (shape) {
    case "ovale":
      return `M0 0 C${P(-c, -0.2 * L)} ${P(-c, -0.8 * L)} ${P(0, -L)} C${P(c, -0.8 * L)} ${P(c, -0.2 * L)} 0 0 Z`;
    case "pointue":
      return `M0 0 C${P(-c * 1.1, -0.15 * L)} ${P(-c * 0.6, -0.6 * L)} ${P(0, -L)} C${P(c * 0.6, -0.6 * L)} ${P(c * 1.1, -0.15 * L)} 0 0 Z`;
    case "coeur":
      return `M0 0 C${P(-c, -0.1 * L)} ${P(-c * 1.05, -0.85 * L)} ${P(-0.18 * h, -L)} L${P(0, -0.9 * L)} L${P(0.18 * h, -L)} C${P(c * 1.05, -0.85 * L)} ${P(c, -0.1 * L)} 0 0 Z`;
    case "goutte":
      return `M0 0 C${P(-0.1 * W, -0.25 * L)} ${P(-c * 1.1, -0.45 * L)} ${P(-c * 1.1, -0.72 * L)} C${P(-c * 1.1, -1.02 * L)} ${P(c * 1.1, -1.02 * L)} ${P(c * 1.1, -0.72 * L)} C${P(c * 1.1, -0.45 * L)} ${P(0.1 * W, -0.25 * L)} 0 0 Z`;
    default:
      return `M0 0 C${P(-c, -0.05 * L)} ${P(-c, -L)} ${P(0, -L)} C${P(c, -L)} ${P(c, -0.05 * L)} 0 0 Z`;
  }
}

/** Trait dessiné (coordonnées de pétale) -> tracé dans le repère de la pétale. */
export function strokePath(s: Stroke, L: number, W: number): string {
  const pts = s.points.map(([u, v]) => `${(u * W).toFixed(2)} ${(-v * L).toFixed(2)}`);
  return pts.length === 1 ? `M${pts[0]} L${pts[0]}` : `M${pts.join(" L")}`;
}

const L0 = 42; // longueur des pétales dans le repère -50..50

/** Contenu d'une fleur centrée en (0,0), à placer dans un <Svg> ou un <G>. */
export function FlowerBody({ flower, uid }: { flower: Flower; uid: string }) {
  const n = flower.petals;
  const W = petalWidth(flower.shape, L0, n);
  const d = petalPath(flower.shape, L0, W);
  const clip = `clip${uid}`;
  return (
    <>
      <Defs>
        <ClipPath id={clip}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      {Array.from({ length: n }, (_, i) => (
        <G key={i} rotation={(360 / n) * i}>
          <Path d={d} fill={flower.petal_color} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
          {flower.drawing.map((s, j) => (
            <Path
              key={j}
              d={strokePath(s, L0, W)}
              stroke={s.color}
              strokeWidth={s.width * L0}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              clipPath={`url(#${clip})`}
            />
          ))}
        </G>
      ))}
      <Circle r={8.5} fill={flower.center_color} stroke={INK} strokeWidth={1.2} />
    </>
  );
}

export function FlowerSvg({ flower, size }: { flower: Flower; size: number }) {
  const uid = useId().replace(/\W/g, "");
  return (
    <Svg width={size} height={size} viewBox="-50 -50 100 100">
      <FlowerBody flower={flower} uid={uid} />
    </Svg>
  );
}

/** Petite pastille de forme (choix de la forme des pétales). */
export function ShapeSwatch({ shape, size, color }: { shape: ShapeKey; size: number; color: string }) {
  const L = 44;
  return (
    <Svg width={size} height={size} viewBox="-30 -52 60 60">
      <Path d={petalPath(shape, L, petalWidth(shape, L, 5))} fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

/** Bouquet : les tiges se rejoignent dans un papier kraft noué d'un ruban ; la ficelle descend vers le petit mot. */
export function BouquetView({ flowers, size }: { flowers: Flower[]; size: number }) {
  const uid = useId().replace(/\W/g, "");
  const k = flowers.length;
  const scale = Math.max(0.62, 1.22 - 0.07 * k);
  const spread = k === 1 ? 0 : Math.min(48, 12 + 9 * k);
  const heads = flowers.map((_, i) => {
    const a = k === 1 ? 0 : (-spread + (2 * spread * i) / (k - 1)) * (Math.PI / 180);
    const r = k === 1 ? 118 : 122 - (i % 2) * 26;
    return { x: 150 + r * Math.sin(a), y: 250 - r * Math.cos(a) };
  });
  return (
    <Svg width={size} height={(size * 330) / 300} viewBox="0 0 300 330">
      {heads.map((h, i) => (
        <G key={`s${i}`}>
          <Path d={`M150 240 Q${(150 + h.x) / 2} ${(240 + h.y) / 2 + 18} ${h.x} ${h.y + 20}`} stroke="#7F9468" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path
            d={`M${(150 + h.x) / 2} ${(240 + h.y) / 2 + 14} q${i % 2 ? 22 : -22} -6 ${i % 2 ? 26 : -26} -26 q${i % 2 ? -22 : 22} 4 ${i % 2 ? -26 : 26} 26 Z`}
            fill="#A9C08C"
            stroke={INK}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </G>
      ))}
      {heads.map((h, i) => (
        <G key={`f${i}`} x={h.x} y={h.y} scale={scale * 1.1}>
          <FlowerBody flower={flowers[i]} uid={`${uid}${i}`} />
        </G>
      ))}
      {/* papier kraft */}
      <Path d="M88 205 Q150 214 212 205 L172 300 Q150 304 128 300 Z" fill="#E6CDA3" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M122 212 L136 298 M178 212 L164 298" stroke="#C9AE80" strokeWidth={1.6} fill="none" />
      {/* ruban + noeud */}
      <Path d="M112 250 Q150 258 188 250 L186 262 Q150 270 114 262 Z" fill="#E26D6D" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M150 256 q-26 -16 -30 4 q4 18 30 -4 Z M150 256 q26 -16 30 4 q-4 18 -30 -4 Z" fill="#E26D6D" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={150} cy={257} r={4} fill="#C8654B" stroke={INK} strokeWidth={1.4} />
      {/* ficelle vers le petit mot */}
      <Path d="M150 262 Q166 292 150 326" stroke="#8A5E38" strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
