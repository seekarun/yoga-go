"use client";

import { createContext, useContext } from "react";
import type { ColorPalette } from "@/lib/colorPalette";

interface BrandColorsContextValue {
  palette?: ColorPalette;
  customColors: { name: string; hex: string }[];
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

const BrandColorsContext = createContext<BrandColorsContextValue>({
  customColors: [],
});

export function BrandColorsProvider({
  palette,
  customColors,
  onCustomColorsChange,
  children,
}: BrandColorsContextValue & { children: React.ReactNode }) {
  return (
    <BrandColorsContext.Provider
      value={{ palette, customColors, onCustomColorsChange }}
    >
      {children}
    </BrandColorsContext.Provider>
  );
}

export function useBrandColors(): BrandColorsContextValue {
  return useContext(BrandColorsContext);
}
