"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VirtualizedCombobox } from "./virtual-combobox"

interface FontSelectorProps {
  value: string
  onChange: (value: string) => void
}

interface FontVariant {
  [weight: string]: {
    [style: string]: {
      [subset: string]: {
        url: {
          woff2: string
          woff: string
          ttf: string
        }
      }
    }
  }
}

interface FontDetails {
  id: string
  family: string
  subsets: string[]
  weights: number[]
  styles: string[]
  defSubset: string
  unicodeRange: Record<string, string>
  variable: boolean
  category: string
  version: string
  type: string
  variants: FontVariant
}

// Cache for loaded fonts and their details
const loadedFonts = new Map<string, Promise<FontDetails>>()
const loadedFontFaces = new Set<string>()

// Common fonts to prioritize in sorting
const commonFonts = [
  'roboto', 'open-sans', 'lato', 'montserrat', 'poppins', 'inter', 'nunito',
  'ubuntu', 'source-sans-3', 'pt-sans', 'noto-sans', 'merriweather',
  'playfair-display', 'pt-serif', 'noto-serif', 'libre-baskerville',
  'anton', 'exo-2', 'orbitron', 'inconsolata', 'space-mono'
]

// Function to load font details and create FontFace
const loadFont = async (fontId: string, family: string): Promise<boolean> => {
  // Return early if the font is already loaded
  if (loadedFontFaces.has(fontId)) return true

  try {
    // Fetch font details if not already fetching
    let fontDetailsPromise = loadedFonts.get(fontId)
    if (!fontDetailsPromise) {
      fontDetailsPromise = fetch(`https://api.fontsource.org/v1/fonts/${fontId}`)
        .then(async res => {
          if (!res.ok) throw new Error(`Failed to fetch font details: ${res.statusText}`)
          return res.json()
        })
      loadedFonts.set(fontId, fontDetailsPromise)
    }

    const fontDetails = await fontDetailsPromise

    // Get the default weight and style
    const weight = fontDetails.weights.includes(400) ? 400 : fontDetails.weights[0]
    const style = fontDetails.styles.includes('normal') ? 'normal' : fontDetails.styles[0]
    const subset = fontDetails.defSubset || 'latin'

    // Ensure we have the necessary variant data
    const variant = fontDetails.variants[weight]?.[style]?.[subset]
    if (!variant?.url?.woff2) {
      throw new Error(`Font variant not found for ${family}`)
    }

    // Create and load the FontFace
    const fontFace = new FontFace(family, `url(${variant.url.woff2})`, {
      weight: weight.toString(),
      style,
      unicodeRange: fontDetails.unicodeRange[subset],
      display: commonFonts.includes(fontId) ? 'swap' : 'optional' // Use swap for common fonts
    })

    // Load the font and add it to the document
    await fontFace.load()
    document.fonts.add(fontFace)
    loadedFontFaces.add(fontId)

    return true
  } catch (error) {
    console.error(`Error loading font ${family}:`, error)
    // Remove failed promise from cache so it can be retried
    loadedFonts.delete(fontId)
    return false
  }
}

const FontSelector: React.FC<FontSelectorProps> = ({ value, onChange }) => {
  const [loading, setLoading] = React.useState(false)
  const [fonts, setFonts] = React.useState<Array<{ id: string, family: string }>>([])
  const [error, setError] = React.useState<string | null>(null)

  // Fetch fonts when component mounts
  React.useEffect(() => {
    async function fetchFonts() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("https://api.fontsource.org/fontlist?family")
        if (!response.ok) throw new Error(`Failed to fetch fonts: ${response.statusText}`)
        
        const fontMap = await response.json() as Record<string, string>
        
        // Convert the font map to our format and filter out icon fonts
        const fontList = Object.entries(fontMap)
          .filter(([_, family]) => !family.toLowerCase().includes('icon'))
          .map(([id, family]) => ({
            id,
            family
          }))
          // Sort with common fonts first, then alphabetically
          .sort((a, b) => {
            const aIsCommon = commonFonts.includes(a.id)
            const bIsCommon = commonFonts.includes(b.id)
            if (aIsCommon && !bIsCommon) return -1
            if (!aIsCommon && bIsCommon) return 1
            return a.family.localeCompare(b.family)
          })

        setFonts(fontList)

        // Preload common fonts in parallel
        await Promise.allSettled(
          commonFonts.map(async (fontId) => {
            const font = fontList.find(f => f.id === fontId)
            if (font) {
              await loadFont(font.id, font.family)
            }
          })
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch fonts"
        console.error("Error fetching fonts:", error)
        setError(message)
      }
      setLoading(false)
    }

    fetchFonts()
  }, [])

  // Handle font selection
  const handleSelect = async (fontFamily: string) => {
    const font = fonts.find(f => f.family === fontFamily)
    if (!font) return

    try {
      const success = await loadFont(font.id, font.family)
      if (!success) {
        throw new Error(`Failed to load font ${font.family}`)
      }
      onChange(fontFamily)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load font"
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading fonts...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="w-full">
      <VirtualizedCombobox
        options={fonts.map(f => f.family)}
        searchPlaceholder="Select a font..."
        width="100%"
        height="300px"
        value={value}
        onChange={handleSelect}
      />
    </div>
  )
}

export default FontSelector
