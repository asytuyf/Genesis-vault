// The square logo tile in front of a subscription.

import {
  House, Smartphone, Wifi, Dumbbell, Shield, Zap, Flame, Droplet, TrainFront, Bus, Car, GraduationCap, Landmark,
  Music, Tv, Cloud, Gamepad2, Newspaper, Sparkles, BookOpen, type LucideIcon,
} from "lucide-react";
import { type BrandLook, type Glyph, tint } from "@/lib/brands";

const GLYPHS: Record<Glyph, LucideIcon> = {
  home: House,
  phone: Smartphone,
  wifi: Wifi,
  gym: Dumbbell,
  shield: Shield,
  zap: Zap,
  flame: Flame,
  drop: Droplet,
  train: TrainFront,
  bus: Bus,
  car: Car,
  school: GraduationCap,
  bank: Landmark,
  music: Music,
  tv: Tv,
  cloud: Cloud,
  game: Gamepad2,
  news: Newspaper,
  sparkles: Sparkles,
  book: BookOpen,
};

const SIZES = {
  sm: { box: "h-9 w-9", inner: 18, text: "text-sm" },
  md: { box: "h-12 w-12", inner: 24, text: "text-lg" },
} as const;

export function BrandIcon({ look, size = "md", muted = false }: { look: BrandLook; size?: keyof typeof SIZES; muted?: boolean }) {
  const s = SIZES[size];
  const color = muted ? "#71717A" : look.color;
  const Glyph = look.glyph ? GLYPHS[look.glyph] : null;

  return (
    <span
      aria-hidden
      className={`${s.box} shrink-0 inline-flex items-center justify-center border`}
      style={{ backgroundColor: tint(color, 0.12), borderColor: tint(color, 0.35) }}
    >
      {look.icon ? (
        // The logo is used as a mask, so it can take any colour.
        <span
          style={{
            width: s.inner,
            height: s.inner,
            backgroundColor: color,
            WebkitMaskImage: `url(/brands/${look.icon}.svg)`,
            maskImage: `url(/brands/${look.icon}.svg)`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      ) : Glyph ? (
        <Glyph size={s.inner} style={{ color }} strokeWidth={2.2} />
      ) : (
        <span className={`${s.text} font-black leading-none`} style={{ color }}>
          {look.letter}
        </span>
      )}
    </span>
  );
}
