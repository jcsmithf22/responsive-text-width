"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { VirtualizedCombobox } from "./virtual-combobox";

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onWeightsChange?: (weights: number[]) => void;
  onFontWeightSupport?: (weight: number, supported: boolean) => void;
}

interface FontVariant {
  [weight: string]: {
    [style: string]: {
      [subset: string]: {
        url: {
          woff2: string;
          woff: string;
          ttf: string;
        };
      };
    };
  };
}

interface FontDetails {
  id: string;
  family: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  defSubset: string;
  variable: boolean;
  category: string;
  version: string;
  type: string;
  lastModified: string;
  variants?: FontVariant;
}

interface FontOption {
  id: string;
  family: string;
  isVariable?: boolean;
  weights?: number[];
}

// Cache for loaded fonts and their details
const loadedFonts = new Map<string, Promise<FontDetails>>();
const loadedFontFaces = new Set<string>();

// Common fonts to prioritize in sorting
const commonFonts = ["inter", "roboto"];

// Function to get CDN URL for a font
const getFontUrl = (
  fontId: string,
  subset: string,
  isVariable: boolean,
  weight?: number,
  style?: string,
) => {
  if (isVariable) {
    return `https://cdn.jsdelivr.net/fontsource/fonts/${fontId}:vf@latest/${subset}-wght-${style || "normal"}.woff2`;
  }
  return `https://cdn.jsdelivr.net/fontsource/fonts/${fontId}@latest/${subset}-${weight}-${style || "normal"}.woff2`;
};

// Function to load font details and create FontFace
const loadFont = async (
  fontId: string,
  family: string,
  isVariable = false,
  weights?: number[],
): Promise<boolean> => {
  try {
    // Fetch font details if not already fetching
    let fontDetailsPromise = loadedFonts.get(fontId);
    if (!fontDetailsPromise) {
      fontDetailsPromise = fetch(
        `https://api.fontsource.org/v1/fonts/${fontId}`,
      ).then(async (res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch font details: ${res.statusText}`);
        return res.json();
      });
      loadedFonts.set(fontId, fontDetailsPromise);
    }

    const fontDetails = await fontDetailsPromise;
    const subset = fontDetails.defSubset || "latin";
    const style = fontDetails.styles.includes("normal")
      ? "normal"
      : fontDetails.styles[0];

    // For variable fonts, load once with full weight range
    if (isVariable) {
      const fontKey = `${fontId}-variable`;
      if (loadedFontFaces.has(fontKey)) return true;

      const url = getFontUrl(fontId, subset, true, undefined, style);

      const fontFace = new FontFace(family, `url(${url})`, {
        style,
        display: commonFonts.includes(fontId) ? "swap" : "optional",
        weight: "100 900",
      });

      await fontFace.load();
      document.fonts.add(fontFace);
      loadedFontFaces.add(fontKey);
      return true;
    }

    // For static fonts, load all available weights in parallel
    const weightsToLoad = weights || fontDetails.weights;
    const results = await Promise.allSettled(
      weightsToLoad.map(async (weight) => {
        const fontKey = `${fontId}-${weight}`;
        if (loadedFontFaces.has(fontKey)) return true;

        const url = getFontUrl(fontId, subset, false, weight, style);

        const fontFace = new FontFace(family, `url(${url})`, {
          style,
          display: commonFonts.includes(fontId) ? "swap" : "optional",
          weight: weight.toString(),
        });

        await fontFace.load();
        document.fonts.add(fontFace);
        loadedFontFaces.add(fontKey);
        return true;
      }),
    );

    // Check if all weights loaded successfully
    return results.every(
      (result) => result.status === "fulfilled" && result.value === true,
    );
  } catch (error) {
    console.error(`Error loading font ${family}:`, error);
    // Remove failed promise from cache so it can be retried
    loadedFonts.delete(fontId);
    return false;
  }
};

const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  onWeightsChange,
  onFontWeightSupport,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [fontLoading, setFontLoading] = React.useState(false);
  const [fonts, setFonts] = React.useState<FontOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch fonts when component mounts
  React.useEffect(() => {
    async function fetchFonts() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://api.fontsource.org/v1/fonts?type=google",
        );
        if (!response.ok)
          throw new Error(`Failed to fetch fonts: ${response.statusText}`);

        const fontList = (await response.json()) as FontDetails[];

        // Transform to our format, including variable versions
        const processedFonts = fontList.flatMap((font) => {
          const fonts = [
            {
              id: font.id,
              family: font.family,
              isVariable: false,
              weights: font.weights,
            },
          ];

          // Add variable version if available
          if (font.variable) {
            fonts.push({
              id: font.id,
              family: font.family + " Variable",
              isVariable: true,
              weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], // Variable fonts support all weights
            });
          }

          return fonts;
        });

        const systemFonts: FontOption[] = [
          "serif",
          "sans-serif",
          "monospace",
        ].map((s) => ({
          id: s,
          family: s,
          isVariable: false,
          weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        }));
        const allFonts = [...systemFonts, ...processedFonts];
        setFonts(allFonts);
        if (onWeightsChange) {
          const selectedFont = allFonts.find(
            (font) => font.family === value && !font.isVariable,
          );
          if (selectedFont && selectedFont.weights) {
            onWeightsChange(selectedFont.weights);
          }
        }

        // Preload common fonts in parallel
        await Promise.allSettled(
          commonFonts.map(async (fontId) => {
            const font = processedFonts.find((f) => f.id === fontId);
            if (font) {
              await loadFont(
                font.id,
                font.family,
                font.isVariable,
                font.weights,
              );
            }
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch fonts";
        console.error("Error fetching fonts:", error);
        setError(message);
      }
      setLoading(false);
    }

    fetchFonts();
  }, []);

  // Handle font selection
  const handleSelect = async (fontFamily: string) => {
    if (["serif", "sans-serif", "monospace"].includes(fontFamily)) {
      onChange(fontFamily);
      if (onWeightsChange) onWeightsChange([400]);
      return;
    }
    const font = fonts.find((f) => f.family === fontFamily);
    if (!font) return;

    try {
      setFontLoading(true);
      const success = await loadFont(
        font.id,
        font.family,
        font.isVariable,
        font.weights,
      );
      setFontLoading(false);
      if (!success) {
        throw new Error(`Failed to load font ${font.family}`);
      }

      // Notify parent about available weights for non-variable fonts
      if (!font.isVariable && font.weights && onWeightsChange) {
        onWeightsChange(font.weights);
      }

      onChange(fontFamily);
    } catch (error) {
      setFontLoading(false);
      const message =
        error instanceof Error ? error.message : "Failed to load font";
      setError(message);
    }
  };

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
  //       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  //       Loading fonts...
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="py-6 text-center text-sm text-destructive">{error}</div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center">
        <VirtualizedCombobox
          options={fonts.map((f) => f.family)}
          searchPlaceholder="Select a font..."
          width="300px"
          height="300px"
          value={value}
          onChange={handleSelect}
        />
        {(loading || fontLoading) && (
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        )}
      </div>
    </div>
  );
};

export default FontSelector;
