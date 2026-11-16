// Hand-drawn placeholder house (SVG). Replaced by a PNG when provided.
import Svg, { Path, Rect } from "react-native-svg";

import { useTheme } from "@/src/theme";

export function HouseArt({ size, color, lit, snow }: { size: number; color: string; lit: boolean; snow?: boolean }) {
  const { colors } = useTheme();
  const ink = colors.houseInk;
  const win = lit ? colors.glow : colors.houseWindow;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* chimney */}
      <Path d="M68 22 L69 8 L78 9 L77 30" fill={color} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      {/* walls */}
      <Path
        d="M20 46 Q19 70 21 92 Q50 94 80 91 Q82 70 80 46"
        fill={color}
        stroke={ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* roof */}
      <Path
        d="M10 50 Q30 30 50 12 Q70 30 91 49 Q86 53 80 47 Q62 30 50 22 Q36 32 20 48 Q15 54 10 50 Z"
        fill={colors.woodLight}
        stroke={ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* snow on the roof (winter) */}
      {snow && (
        <Path
          d="M12 49 Q30 31 50 14 Q70 31 89 48 Q84 47 80 43 Q76 46 72 40 Q66 42 62 35 Q56 37 50 26 Q44 37 38 35 Q34 42 28 40 Q24 46 20 43 Q16 48 12 49 Z"
          fill={colors.snow}
          stroke={ink}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}
      {/* door */}
      <Path d="M43 92 L43 70 Q50 63 57 70 L57 92" fill={colors.wood} stroke={ink} strokeWidth={2.5} />
      {/* windows */}
      <Rect x={26} y={58} width={12} height={12} rx={2} fill={win} stroke={ink} strokeWidth={2.2} />
      <Rect x={63} y={58} width={12} height={12} rx={2} fill={win} stroke={ink} strokeWidth={2.2} />
      <Path d="M32 58 L32 70 M26 64 L38 64 M69 58 L69 70 M63 64 L75 64" stroke={ink} strokeWidth={1.4} />
    </Svg>
  );
}
