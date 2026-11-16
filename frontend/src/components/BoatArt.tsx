// Petit voilier dessiné à la main (SVG), même trait que les maisons. Remplacé par un PNG si on en fournit un.
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/src/theme";

export function BoatArt({ size, color, lit }: { size: number; color: string; lit: boolean }) {
  const { colors } = useTheme();
  const ink = colors.houseInk;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* mât */}
      <Path d="M50 12 L50 70" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      {/* grande voile */}
      <Path d="M53 16 Q74 40 80 64 Q66 67 53 66 Z" fill={color} stroke={ink} strokeWidth={2.8} strokeLinejoin="round" />
      {/* foc */}
      <Path d="M47 24 Q34 44 24 64 Q36 66 47 66 Z" fill={colors.houseWindow} stroke={ink} strokeWidth={2.8} strokeLinejoin="round" />
      {/* fanion */}
      <Path d="M50 12 L61 15 L50 19 Z" fill={colors.heart} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
      {/* coque */}
      <Path d="M14 70 Q50 76 88 69 Q82 86 68 88 L32 88 Q20 84 14 70 Z" fill={colors.woodLight} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M20 76 Q50 81 83 75" stroke={colors.woodDark} strokeWidth={1.6} fill="none" />
      {/* hublot (allumé la nuit) */}
      <Circle cx={50} cy={80} r={3.4} fill={lit ? colors.glow : colors.houseWindow} stroke={ink} strokeWidth={1.6} />
      {/* vagues */}
      <Path d="M8 93 Q15 89 22 93 T36 93 T50 93 T64 93 T78 93 T92 93" stroke={colors.petalC} strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
