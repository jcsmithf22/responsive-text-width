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
  variable: boolean
  category: string
  version: string
  type: string
  lastModified: string
  variants?: FontVariant
}

interface FontOption {
  id: string
  family: string
  isVariable?: boolean
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

// Function to get CDN URL for a font
const getFontUrl = (fontId: string, subset: string, isVariable: boolean, weight?: number, style?: string) => {
  if (isVariable) {
    return `https://cdn.jsdelivr.net/fontsource/fonts/${fontId}:vf@latest/${subset}-wght-${style || 'normal'}.woff2`
  }
  return `https://cdn.jsdelivr.net/fontsource/fonts/${fontId}@latest/${subset}-${weight}-${style || 'normal'}.woff2`
}

// Function to load font details and create FontFace
const loadFont = async (fontId: string, family: string, isVariable = false): Promise<boolean> => {
  // Return early if the font is already loaded
  const fontKey = isVariable ? `${fontId}-variable` : fontId
  if (loadedFontFaces.has(fontKey)) return true

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
    const subset = fontDetails.defSubset || 'latin'
    const style = fontDetails.styles.includes('normal') ? 'normal' : fontDetails.styles[0]

    // Create the font family name for variable fonts
    const familyName = isVariable ? `${family} Variable` : family
    
    // Get the URL based on whether it's a variable font
    const url = getFontUrl(
      fontId,
      subset,
      isVariable,
      !isVariable ? (fontDetails.weights.includes(400) ? 400 : fontDetails.weights[0]) : undefined,
      style
    )

    // Create and load the FontFace
    const fontFace = new FontFace(familyName, `url(${url})`, {
      style,
      display: commonFonts.includes(fontId) ? 'swap' : 'optional',
      ...(isVariable ? { weight: '100 900' } : { weight: '400' })
    })

    // Load the font and add it to the document
    await fontFace.load()
    document.fonts.add(fontFace)
    loadedFontFaces.add(fontKey)

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
  const [fonts, setFonts] = React.useState<FontOption[]>([])
  const [error, setError] = React.useState<string | null>(null)

  // Fetch fonts when component mounts
  React.useEffect(() => {
    async function fetchFonts() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("https://api.fontsource.org/v1/fonts?type=google")
        if (!response.ok) throw new Error(`Failed to fetch fonts: ${response.statusText}`)
        
        const fontList = await response.json() as FontDetails[]
        
        // Filter out icon fonts and transform to our format, including variable versions
        const processedFonts = fontList
          .flatMap(font => {
            const fonts = [{
              id: font.id,
              family: font.family,
              isVariable: false
            }]
            
            // Add variable version if available
            if (font.variable) {
              fonts.push({
                id: font.id,
                family: `${font.family} Variable`,
                isVariable: true
              })
            }
            
            return fonts
          })

        setFonts(processedFonts)

        // Preload common fonts in parallel
        await Promise.allSettled(
          commonFonts.map(async (fontId) => {
            const font = processedFonts.find(f => f.id === fontId)
            if (font) {
              await loadFont(font.id, font.family, font.isVariable)
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
      const success = await loadFont(font.id, font.family, font.isVariable)
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
        width="300px"
        height="300px"
        value={value}
        onChange={handleSelect}
      />
    </div>
  )
}

export default FontSelector
