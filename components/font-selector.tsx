"use client"

// Start loading fonts immediately when this module is imported
let fontListPromise: Promise<FontListItem[]> | null = null

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual"

// Fontsource API types
type FontListItem = {
  id: string
  family: string
}

interface FontSelectorProps {
  value: string
  onChange: (value: string) => void
}

// Global state for fonts
let globalFontList: FontListItem[] = []
const loadedFonts = new Map<string, Promise<void>>()

// Common Google fonts to preload
const commonFonts = [
  // Sans-serif fonts
  'roboto',
  'open-sans',
  'lato',
  'montserrat',
  'poppins',
  'inter',
  'nunito',
  'ubuntu',
  'source-sans-3',
  'pt-sans',
  'noto-sans',

  // Serif fonts
  'merriweather',
  'playfair-display',
  'pt-serif',
  'noto-serif',
  'libre-baskerville',

  // Display fonts
  'anton',
  'exo-2',
  'orbitron',

  // Monospace fonts
  'inconsolata',
  'space-mono'
]

// Load font CSS
async function loadFontCSS(font: FontListItem, isCommon = false): Promise<void> {
  // Return existing promise if font is already loading
  const existingPromise = loadedFonts.get(font.id)
  if (existingPromise) return existingPromise

  const loadPromise = (async () => {
    try {
      const response = await fetch(`https://api.fontsource.org/v1/fonts/${font.id}`)
      if (!response.ok) throw new Error("Failed to fetch font details")
      
      const fontDetails = await response.json()
      if (!fontDetails.variants) throw new Error("No font variants found")

      const defaultWeight = fontDetails.weights.includes(400) ? '400' : fontDetails.weights[0].toString()
      const defaultStyle = fontDetails.styles.includes('normal') ? 'normal' : fontDetails.styles[0]
      
      const variantUrl = fontDetails.variants[defaultWeight]?.[defaultStyle]?.latin?.url?.woff2
      if (!variantUrl) throw new Error("Font URL not found")

      const fontFace = new FontFace(font.family, `url(${variantUrl})`, {
        weight: defaultWeight,
        style: defaultStyle,
        // Use 'optional' for non-common fonts to prevent layout shift
        // Use 'swap' for common fonts to ensure they load quickly
        display: isCommon ? 'swap' : 'optional'
      })

      const loadedFont = await fontFace.load()
      document.fonts.add(loadedFont)
    } catch (err) {
      // Remove failed promise from cache
      loadedFonts.delete(font.id)
      throw err
    }
  })()

  // Cache the promise
  loadedFonts.set(font.id, loadPromise)
  return loadPromise
}

// Sort fonts with common fonts first
function sortFonts(fonts: FontListItem[]): FontListItem[] {
  return [...fonts].sort((a, b) => {
    const aIsCommon = commonFonts.includes(a.id)
    const bIsCommon = commonFonts.includes(b.id)
    if (aIsCommon && !bIsCommon) return -1
    if (!aIsCommon && bIsCommon) return 1
    return a.family.localeCompare(b.family)
  })
}

// Fetch and process font list
async function fetchFontList(): Promise<FontListItem[]> {
  try {
    const response = await fetch('https://api.fontsource.org/fontlist?family')
    if (!response.ok) throw new Error("Failed to fetch fonts")

    const fontList = await response.json() as Record<string, string>

    const fonts = Object.entries(fontList)
      .map(([id, family]) => ({
        id,
        family
      }))
      .filter(font => !font.family.includes('icons'))

    const sortedFonts = sortFonts(fonts)

    // Preload common fonts in parallel
    await Promise.allSettled(
      sortedFonts
        .filter(font => commonFonts.includes(font.id))
        .map(font => loadFontCSS(font, true))
    )

    return sortedFonts
  } catch (err) {
    console.error("Error fetching font list:", err)
    return []
  }
}

// Initialize font list as soon as this module is loaded
if (typeof window !== 'undefined' && !fontListPromise) {
  fontListPromise = fetchFontList().then(fonts => {
    globalFontList = fonts
    return fonts
  })
}


const ITEM_HEIGHT = 32

const FontSelector: React.FC<FontSelectorProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [loadingFont, setLoadingFont] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const parentRef = React.useRef<HTMLDivElement>(null)

  // Load fonts if not already loaded
  useEffect(() => {
    if (fontListPromise) fontListPromise.then()
  }, [])

  // Clear search when opening
  useEffect(() => {
    if (open) setSearchInput("")
  }, [open])

  // Filter fonts based on search input
  const filteredFonts = useMemo(() => {
    const searchTerm = searchInput.toLowerCase()
    console.log(searchTerm)
    return searchTerm
      ? globalFontList.filter(font =>
          font.family.toLowerCase().includes(searchTerm) ||
          font.id.toLowerCase().includes(searchTerm)
        )
      : globalFontList
  }, [searchInput])

  const virtualizer = useVirtualizer({
    count: filteredFonts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  })

  // Load font CSS when selected
  const handleFontSelect = useCallback(async (font: FontListItem) => {
    setLoadingFont(font.id)
    try {
      await loadFontCSS(font, commonFonts.includes(font.id))
      onChange(font.family)
      setOpen(false)
      setSearchInput("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load font")
    } finally {
      setLoadingFont(null)
    }
  }, [onChange])

  
console.log(filteredFonts.length)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span style={{ fontFamily: value }}>{value || "Select a font..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search fonts..." 
            value={searchInput}
            onValueChange={setSearchInput}
            className="h-9"
          />
          {/* <CommandEmpty className="py-6 text-center text-sm">
            {filteredFonts.length === 0 && globalFontList.length === 0 ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading fonts...</span>
              </div>
            ) : error ? (
              error
            ) : searchInput ? (
              "No fonts found."
            ) : (
              "Type to search fonts..."
            )}
          </CommandEmpty> */}
          <CommandGroup 
            ref={parentRef}
            style={{
              height: '300px',
              width: '100%',
              overflow: 'auto'
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                const font = filteredFonts[virtualRow.index]
                return (
                  <CommandItem
                    key={font.id}
                    value={font.family}
                    onSelect={() => handleFontSelect(font)}
                    className={cn(
                      "cursor-pointer absolute top-0 left-0 w-full",
                      loadingFont === font.id && "opacity-50 pointer-events-none"
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {loadingFont === font.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === font.family ? "opacity-100" : "opacity-0"
                          )}
                        />
                      )}
                      <span style={{ fontFamily: font.family }}>{font.family}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </div>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default FontSelector
