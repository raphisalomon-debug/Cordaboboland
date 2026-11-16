// House picture: uploaded image > PNG from config/assets.ts > drawn placeholder.
import { Image } from "expo-image";

import { fileSource } from "@/src/api";
import { HouseArt } from "@/src/components/HouseArt";
import { HOUSE_IMAGES } from "@/src/config/assets";
import { House } from "@/src/features/houses/api";

export function HouseImage({ house, size, lit, snow }: { house: House; size: number; lit: boolean; snow?: boolean }) {
  if (house.image_path) {
    return <Image source={fileSource(house.image_path)} style={{ width: size, height: size }} contentFit="contain" />;
  }
  const local = HOUSE_IMAGES[house.key];
  if (local) return <Image source={local} style={{ width: size, height: size }} contentFit="contain" />;
  return <HouseArt size={size} color={house.color} lit={lit} snow={snow} />;
}
