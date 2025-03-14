"use client";

import { useState, useEffect, forwardRef, useRef, useCallback } from "react";
import FontFaceObserver from "fontfaceobserver";

// Define types for units
export type Unit = "px" | "em" | "rem" | "%" | "vw" | "vh" | "ch" | "";
export type ValueWithUnit = { value: number; unit: Unit };
export type SpacingWithUnit = {
  top: ValueWithUnit;
  right: ValueWithUnit;
  bottom: ValueWithUnit;
  left: ValueWithUnit;
};

type FitTextProps = {
  text: string;
  fontSize?: number;
  lineHeight?: ValueWithUnit;
  letterSpacing?: ValueWithUnit;
  fontFamily?: string;
  fontWeight?: number;
  ref: React.RefObject<SVGSVGElement | null>;
};

const FitText = ({
  text,
  fontSize = 200,
  lineHeight = { value: 1.0, unit: "" },
  letterSpacing = { value: 0, unit: "px" },
  fontFamily = "Inter",
  fontWeight = 500,
  ref,
}: FitTextProps) => {
  const [textWidth, setTextWidth] = useState<number | null>(null);
  const [viewBoxHeight, setViewBoxHeight] = useState<number | null>(null);
  const fontFamilyRef = useRef<string>(fontFamily);
  const measureTextDebounceRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFontLoaded, setIsFontLoaded] = useState(false);

  // Create and cache canvas context
  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
    return () => {
      canvasRef.current = null;
    };
  }, []);

  // Format value with unit for CSS
  const formatValueWithUnit = (value: ValueWithUnit) => {
    return `${value.value}${value.unit}`;
  };

  // Convert units to pixels for measurement
  const convertToPixels = useCallback(
    (value: ValueWithUnit): number => {
      const { value: val, unit } = value;

      switch (unit) {
        case "px":
          return val;
        case "em":
          return val * fontSize;
        case "rem":
          return val * 16;
        case "%":
          return (val / 100) * fontSize;
        case "vw":
          return (val / 100) * window.innerWidth;
        case "vh":
          return (val / 100) * window.innerHeight;
        case "ch":
          const charWidth = canvasRef.current
            ? canvasRef.current.getContext("2d")?.measureText("0").width ||
              fontSize * 0.5
            : fontSize * 0.5;
          return val * charWidth;
        default:
          return val;
      }
    },
    [fontSize],
  );

  // Function to measure text and calculate dimensions
  const measureText = useCallback(() => {
    if (!canvasRef.current || !isFontLoaded) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Set font before measuring
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Measure the text
    const metrics = ctx.measureText(text);
    const letterSpacingInPx = convertToPixels(letterSpacing);

    // Calculate width including letter spacing
    let computedWidth = metrics.width;
    if (text.length > 1) {
      computedWidth += letterSpacingInPx * (text.length - 1);
    }

    // Calculate height based on line height and padding
    const lineHeightValue = lineHeight.unit
      ? convertToPixels(lineHeight)
      : lineHeight.value * fontSize;
    const computedHeight = lineHeightValue;

    // Only update if values have changed
    if (textWidth !== computedWidth || viewBoxHeight !== computedHeight) {
      setTextWidth(computedWidth);
      setViewBoxHeight(computedHeight);
    }
  }, [
    text,
    fontSize,
    fontWeight,
    letterSpacing,
    isFontLoaded,
    convertToPixels,
    fontFamily,
    lineHeight,
    textWidth,
    viewBoxHeight,
  ]);

  // Debounce the measure text function
  const debouncedMeasureText = useCallback(() => {
    if (measureTextDebounceRef.current !== null) {
      window.clearTimeout(measureTextDebounceRef.current);
    }

    measureTextDebounceRef.current = window.setTimeout(() => {
      measureText();
      measureTextDebounceRef.current = null;
    }, 100);
  }, [measureText]);

  // Check if font is loaded using Font Loading API and document.fonts.check
  const checkFontLoaded = useCallback(async () => {
    try {
      // Try loading with FontFaceObserver first
      const font = new FontFaceObserver(fontFamily, {
        weight: fontWeight.toString(),
      });

      try {
        // Load font with a test string that includes text and common characters
        const testString =
          text +
          "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789";
        await font.load(testString);
        setIsFontLoaded(true);
        measureText();
        return;
      } catch (e) {
        // If FontFaceObserver fails, fallback to document.fonts
        const isFontAvailable = document.fonts.check(
          `${fontWeight} ${fontSize}px ${fontFamily}`,
        );

        if (isFontAvailable) {
          setIsFontLoaded(true);
          measureText();
          return;
        }

        await document.fonts.load(
          `${fontWeight} ${fontSize}px ${fontFamily}`,
          text,
        );
        setIsFontLoaded(true);
        measureText();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error loading font";
      console.error("Font loading error:", errorMessage);
      // If all font loading attempts fail, try measuring anyway after a delay
      setTimeout(() => {
        setIsFontLoaded(true);
        measureText();
      }, 500);
    }
  }, [fontFamily, fontWeight, fontSize, text, measureText]);

  // Handle font family changes
  useEffect(() => {
    if (fontFamilyRef.current !== fontFamily) {
      fontFamilyRef.current = fontFamily;
      setIsFontLoaded(false);
      checkFontLoaded();
    }
  }, [fontFamily, checkFontLoaded]);

  // Handle font weight changes
  useEffect(() => {
    setIsFontLoaded(false);
    checkFontLoaded();
  }, [fontWeight, checkFontLoaded]);

  // Handle text changes and other properties
  useEffect(() => {
    if (isFontLoaded) {
      debouncedMeasureText();
    }
  }, [text, fontSize, letterSpacing, isFontLoaded, debouncedMeasureText]);

  // Initial font load
  useEffect(() => {
    setIsFontLoaded(false);
    checkFontLoaded();
  }, [checkFontLoaded, fontFamily, fontWeight]);

  // Cleanup when unmounting
  useEffect(() => {
    return () => {
      // Cleanup measureTextDebounceRef
      if (measureTextDebounceRef.current !== null) {
        window.clearTimeout(measureTextDebounceRef.current);
      }
    };
  }, []);

  // Don't render until the text width is determined and font is loaded
  if (textWidth === null || viewBoxHeight === null || !isFontLoaded)
    return null;

  return (
    <svg
      ref={ref}
      style={{
        outline: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        flexShrink: 0,
        transform: "none",
        height: "auto",
        width: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        overflow: "visible",
      }}
      viewBox={`0 0 ${textWidth} ${viewBoxHeight}`}
    >
      <foreignObject
        width="100%"
        height="100%"
        style={{
          overflow: "visible",
          transformOrigin: "center center",
          transform: "scale(1)",
        }}
      >
        <p
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            lineHeight: lineHeight.unit
              ? formatValueWithUnit(lineHeight)
              : lineHeight.value,
            letterSpacing: formatValueWithUnit(letterSpacing),
            fontFamily: fontFamily,
            margin: 0,
            padding: 0,
            whiteSpace: "pre",
          }}
        >
          {text}
        </p>
      </foreignObject>
    </svg>
  );
};

export default FitText;
