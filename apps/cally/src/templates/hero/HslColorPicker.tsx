"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { hexToHsl, hslToHex, isValidHexColor } from "@/lib/colorPalette";

interface HslColorPickerProps {
  color: string; // hex e.g. "#FF5733"
  onChange: (hex: string) => void;
  width?: number; // default 260
}

/* ── HSB ↔ HSL helpers ── */

function hslToHsb(
  h: number,
  s: number,
  l: number,
): { h: number; s: number; b: number } {
  // s,l in 0-100
  const sF = s / 100;
  const lF = l / 100;
  const b = lF + sF * Math.min(lF, 1 - lF);
  const sb = b === 0 ? 0 : 2 * (1 - lF / b);
  return { h, s: sb * 100, b: b * 100 };
}

function hsbToHsl(
  h: number,
  s: number,
  b: number,
): { h: number; s: number; l: number } {
  // s,b in 0-100
  const sF = s / 100;
  const bF = b / 100;
  const l = bF * (1 - sF / 2);
  const sl = l === 0 || l === 1 ? 0 : (bF - l) / Math.min(l, 1 - l);
  return { h, s: sl * 100, l: l * 100 };
}

/* ── Shared drag hook ── */

function useDrag(
  onDrag: (x: number, y: number, rect: DOMRect) => void,
  onEnd?: () => void,
) {
  const elRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef(0);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingRef.current || !elRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = elRef.current!.getBoundingClientRect();
        const x = clamp(clientX - rect.left, 0, rect.width);
        const y = clamp(clientY - rect.top, 0, rect.height);
        onDrag(x, y, rect);
      });
    },
    [onDrag],
  );

  const handleEnd = useCallback(() => {
    draggingRef.current = false;
    onEnd?.();
  }, [onEnd]);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      draggingRef.current = true;
      if (elRef.current) {
        const rect = elRef.current.getBoundingClientRect();
        const x = clamp(clientX - rect.left, 0, rect.width);
        const y = clamp(clientY - rect.top, 0, rect.height);
        onDrag(x, y, rect);
      }
    },
    [onDrag],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  return {
    elRef,
    draggingRef,
    onMouseDown: (e: React.MouseEvent) => handleStart(e.clientX, e.clientY),
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      handleStart(t.clientX, t.clientY);
    },
  };
}

/* ── Slider bar helper ── */

function SliderBar({
  elRef,
  onMouseDown,
  onTouchStart,
  label,
  background,
  thumbPosition,
  thumbColor,
  height,
}: {
  elRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  label: string;
  background: string;
  thumbPosition: number;
  thumbColor: string;
  height: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "8px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          fontWeight: 600,
          color: "#9ca3af",
          width: "10px",
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        {label}
      </span>
      <div
        ref={elRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          position: "relative",
          flex: 1,
          height,
          borderRadius: height / 2,
          cursor: "pointer",
          background,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${thumbPosition}%`,
            top: "50%",
            width: height,
            height,
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 2px rgba(0,0,0,0.5)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            backgroundColor: thumbColor,
          }}
        />
      </div>
    </div>
  );
}

/* ── Component ── */

export default function HslColorPicker({
  color,
  onChange,
  width = 260,
}: HslColorPickerProps) {
  // Internal HSB state — derived from prop when not dragging
  const [hue, setHue] = useState(() => hexToHsl(color).h);
  const [sat, setSat] = useState(() => {
    const hsl = hexToHsl(color);
    return hslToHsb(hsl.h, hsl.s, hsl.l).s;
  });
  const [bri, setBri] = useState(() => {
    const hsl = hexToHsl(color);
    return hslToHsb(hsl.h, hsl.s, hsl.l).b;
  });
  const [hexText, setHexText] = useState(color.toUpperCase());
  const isDraggingRef = useRef(false);

  // Sync from parent prop when not actively dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    const hsl = hexToHsl(color);
    const hsb = hslToHsb(hsl.h, hsl.s, hsl.l);
    setHue(hsl.h);
    setSat(hsb.s);
    setBri(hsb.b);
    setHexText(color.toUpperCase());
  }, [color]);

  const emitColor = useCallback(
    (h: number, s: number, b: number) => {
      const hsl = hsbToHsl(h, s, b);
      const hex = hslToHex(hsl.h, hsl.s, hsl.l);
      setHexText(hex.toUpperCase());
      onChange(hex);
    },
    [onChange],
  );

  /* ── 2D area drag (saturation X, brightness Y) ── */
  const areaHandlers = useDrag(
    useCallback(
      (x: number, y: number, rect: DOMRect) => {
        const s = (x / rect.width) * 100;
        const b = (1 - y / rect.height) * 100;
        setSat(s);
        setBri(b);
        emitColor(hue, s, b);
      },
      [hue, emitColor],
    ),
    useCallback(() => {
      isDraggingRef.current = false;
    }, []),
  );

  // Mark dragging on start
  const onAreaMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      areaHandlers.onMouseDown(e);
    },
    [areaHandlers],
  );
  const onAreaTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true;
      areaHandlers.onTouchStart(e);
    },
    [areaHandlers],
  );

  /* ── Hue slider drag ── */
  const hueHandlers = useDrag(
    useCallback(
      (x: number, _y: number, rect: DOMRect) => {
        const h = Math.round((x / rect.width) * 360) % 360;
        setHue(h);
        emitColor(h, sat, bri);
      },
      [sat, bri, emitColor],
    ),
    useCallback(() => {
      isDraggingRef.current = false;
    }, []),
  );

  const onHueMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      hueHandlers.onMouseDown(e);
    },
    [hueHandlers],
  );
  const onHueTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true;
      hueHandlers.onTouchStart(e);
    },
    [hueHandlers],
  );

  /* ── Saturation slider drag (HSL saturation) ── */
  const currentHsl = hsbToHsl(hue, sat, bri);

  const satSliderHandlers = useDrag(
    useCallback(
      (x: number, _y: number, rect: DOMRect) => {
        const newSatHsl = (x / rect.width) * 100;
        const hsb = hslToHsb(hue, newSatHsl, currentHsl.l);
        setSat(hsb.s);
        setBri(hsb.b);
        emitColor(hue, hsb.s, hsb.b);
      },
      [hue, currentHsl.l, emitColor],
    ),
    useCallback(() => {
      isDraggingRef.current = false;
    }, []),
  );

  const onSatMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      satSliderHandlers.onMouseDown(e);
    },
    [satSliderHandlers],
  );
  const onSatTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true;
      satSliderHandlers.onTouchStart(e);
    },
    [satSliderHandlers],
  );

  /* ── Lightness slider drag ── */
  const lightSliderHandlers = useDrag(
    useCallback(
      (x: number, _y: number, rect: DOMRect) => {
        const newLight = (x / rect.width) * 100;
        const hsb = hslToHsb(hue, currentHsl.s, newLight);
        setSat(hsb.s);
        setBri(hsb.b);
        emitColor(hue, hsb.s, hsb.b);
      },
      [hue, currentHsl.s, emitColor],
    ),
    useCallback(() => {
      isDraggingRef.current = false;
    }, []),
  );

  const onLightMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      lightSliderHandlers.onMouseDown(e);
    },
    [lightSliderHandlers],
  );
  const onLightTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true;
      lightSliderHandlers.onTouchStart(e);
    },
    [lightSliderHandlers],
  );

  /* ── Hex input ── */
  const [hexError, setHexError] = useState(false);

  const handleHexChange = useCallback(
    (val: string) => {
      let hex = val;
      if (!hex.startsWith("#")) hex = "#" + hex;
      setHexText(hex.toUpperCase());

      if (isValidHexColor(hex)) {
        setHexError(false);
        const hsl = hexToHsl(hex);
        const hsb = hslToHsb(hsl.h, hsl.s, hsl.l);
        setHue(hsl.h);
        setSat(hsb.s);
        setBri(hsb.b);
        onChange(hex);
      } else {
        setHexError(hex.length >= 7);
      }
    },
    [onChange],
  );

  /* ── Computed values ── */
  const areaHeight = Math.round(width * 0.62);
  const sliderHeight = 14;
  const indicatorRadius = 7;
  const currentHex = (() => {
    const hsl = hsbToHsl(hue, sat, bri);
    return hslToHex(hsl.h, hsl.s, hsl.l);
  })();
  const pureHue = hslToHex(hue, 100, 50);
  const satGradient = `linear-gradient(to right, ${hslToHex(hue, 0, currentHsl.l)}, ${hslToHex(hue, 100, currentHsl.l)})`;
  const lightGradient = `linear-gradient(to right, #000, ${hslToHex(hue, currentHsl.s, 50)}, #fff)`;

  return (
    <div style={{ width, userSelect: "none" }}>
      {/* 2D Saturation / Brightness area */}
      <div
        ref={areaHandlers.elRef}
        onMouseDown={onAreaMouseDown}
        onTouchStart={onAreaTouchStart}
        style={{
          position: "relative",
          width: "100%",
          height: areaHeight,
          borderRadius: "8px",
          overflow: "hidden",
          cursor: "crosshair",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
        }}
      >
        {/* Indicator circle */}
        <div
          style={{
            position: "absolute",
            left: `${sat}%`,
            top: `${100 - bri}%`,
            width: indicatorRadius * 2,
            height: indicatorRadius * 2,
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 2px rgba(0,0,0,0.6)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            backgroundColor: currentHex,
          }}
        />
      </div>

      {/* Hue slider */}
      <SliderBar
        elRef={hueHandlers.elRef}
        onMouseDown={onHueMouseDown}
        onTouchStart={onHueTouchStart}
        label="H"
        background="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))"
        thumbPosition={(hue / 360) * 100}
        thumbColor={pureHue}
        height={sliderHeight}
      />

      {/* Saturation slider */}
      <SliderBar
        elRef={satSliderHandlers.elRef}
        onMouseDown={onSatMouseDown}
        onTouchStart={onSatTouchStart}
        label="S"
        background={satGradient}
        thumbPosition={currentHsl.s}
        thumbColor={hslToHex(hue, currentHsl.s, currentHsl.l)}
        height={sliderHeight}
      />

      {/* Lightness slider */}
      <SliderBar
        elRef={lightSliderHandlers.elRef}
        onMouseDown={onLightMouseDown}
        onTouchStart={onLightTouchStart}
        label="L"
        background={lightGradient}
        thumbPosition={currentHsl.l}
        thumbColor={hslToHex(hue, currentHsl.s, currentHsl.l)}
        height={sliderHeight}
      />

      {/* Preview swatch + Hex input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            backgroundColor: currentHex,
            border: "1px solid rgba(0,0,0,0.12)",
            flexShrink: 0,
          }}
        />
        <input
          type="text"
          value={hexText}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={7}
          style={{
            flex: 1,
            fontSize: "12px",
            fontFamily: "monospace",
            padding: "4px 6px",
            border: hexError
              ? "1px solid #ef4444"
              : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "5px",
            outline: "none",
            textTransform: "uppercase",
            minWidth: 0,
          }}
        />
      </div>
    </div>
  );
}
