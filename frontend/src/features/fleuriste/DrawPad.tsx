// Zone de dessin : une grande pétale, ce qu'on dessine dessus est reproduit sur toutes les pétales.
import { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

import { Flower, Stroke } from "@/src/features/fleuriste/api";
import { petalPath, petalWidth, strokePath } from "@/src/features/fleuriste/FlowerArt";

const PAD_W = 300;
const PAD_H = 330;
const L = 290;
const BASE_Y = 318;
const MAX_STROKES = 60;
const MAX_POINTS = 400;

export function DrawPad({
  flower,
  penColor,
  penWidth,
  onChange,
}: {
  flower: Flower;
  penColor: string;
  penWidth: number;
  onChange: (drawing: Stroke[]) => void;
}) {
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<Stroke | null>(null);
  const latest = useRef({ flower, penColor, penWidth, onChange });
  latest.current = { flower, penColor, penWidth, onChange };

  const W = petalWidth(flower.shape, L, flower.petals);
  const d = petalPath(flower.shape, L, W);

  const responder = useMemo(() => {
    const toUV = (x: number, y: number): [number, number] => {
      const w = petalWidth(latest.current.flower.shape, L, latest.current.flower.petals);
      return [+((x - PAD_W / 2) / w).toFixed(3), +((BASE_Y - y) / L).toFixed(3)];
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        if (latest.current.flower.drawing.length >= MAX_STROKES) return;
        const s: Stroke = {
          color: latest.current.penColor,
          width: latest.current.penWidth,
          points: [toUV(e.nativeEvent.locationX, e.nativeEvent.locationY)],
        };
        liveRef.current = s;
        setLive({ ...s });
      },
      onPanResponderMove: (e) => {
        const s = liveRef.current;
        if (!s || s.points.length >= MAX_POINTS) return;
        s.points.push(toUV(e.nativeEvent.locationX, e.nativeEvent.locationY));
        setLive({ ...s, points: [...s.points] });
      },
      onPanResponderRelease: () => {
        const s = liveRef.current;
        liveRef.current = null;
        setLive(null);
        if (s) latest.current.onChange([...latest.current.flower.drawing, s]);
      },
      onPanResponderTerminate: () => {
        liveRef.current = null;
        setLive(null);
      },
    });
  }, []);

  const strokes = live ? [...flower.drawing, live] : flower.drawing;
  return (
    <View
      style={{ width: PAD_W, height: PAD_H, alignSelf: "center", borderRadius: 16, borderWidth: 1.5, borderColor: "#D1C7B1", backgroundColor: "#FBF8F0" }}
      {...responder.panHandlers}
      testID="fleuriste-pad"
    >
      <Svg width={PAD_W} height={PAD_H} pointerEvents="none">
        <Defs>
          <ClipPath id="padclip">
            <Path d={d} />
          </ClipPath>
        </Defs>
        <G x={PAD_W / 2} y={BASE_Y}>
          <Path d={d} fill={flower.petal_color} stroke="#5A4A3C" strokeWidth={2.4} strokeLinejoin="round" />
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={strokePath(s, L, W)}
              stroke={s.color}
              strokeWidth={s.width * L}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              clipPath="url(#padclip)"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
