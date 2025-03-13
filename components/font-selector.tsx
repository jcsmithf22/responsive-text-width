"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [fonts, setFonts] = React.useState<Array<{ id: string, family: string }>>([])
  const [searchInput, setSearchInput] = React.useState("")
  const [loadingFont, setLoadingFont] = React.useState<string | null>(null)
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

  // Filter fonts based on search input
  const filteredFonts = React.useMemo(() => {
    const searchTerm = searchInput.toLowerCase()
    return searchTerm
      ? fonts.filter(font => 
          font.family.toLowerCase().includes(searchTerm) ||
          font.id.toLowerCase().includes(searchTerm)
        )
      : fonts
  }, [fonts, searchInput])

  // Handle font selection
  const handleSelect = async (fontFamily: string) => {
    const font = fonts.find(f => f.family === fontFamily)
    if (!font) return

    setLoadingFont(font.id)
    setError(null)
    try {
      const success = await loadFont(font.id, font.family)
      if (!success) {
        throw new Error(`Failed to load font ${font.family}`)
      }
      onChange(fontFamily)
      setOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load font"
      setError(message)
    } finally {
      setLoadingFont(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          style={{ fontFamily: value }}
        >
          {value || "Select a font..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search fonts..."
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading fonts...
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : filteredFonts.length === 0 ? (
              <CommandEmpty>No fonts found.</CommandEmpty>
            ) : (
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {filteredFonts.map((font) => (
                  <CommandItem
                    key={font.id}
                    value={font.family}
                    onSelect={handleSelect}
                    className="cursor-pointer"
                    disabled={loadingFont === font.id}
                  >
                    {loadingFont === font.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === font.family ? "opacity-100" : "opacity-0"
                        )}
                      />
                    )}
                    <span style={{ fontFamily: font.family }}>{font.family}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default FontSelector
