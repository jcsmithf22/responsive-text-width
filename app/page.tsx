"use client"

import React, { useState, useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, Copy, Loader2 } from "lucide-react"
import UnitInput from "@/components/unit-input"
import FontSelector from "@/components/font-selector"
import { ValidatedInput } from "@/components/validated-input"
import FitText from "@/components/fit-text"
import { ValueWithUnit } from "@/types"

const formatValueWithUnit = (value: ValueWithUnit) => {
  if (value.unit) {
    return `${value.value}${value.unit}`
  }
  return value.value.toString()
}


export default function TextEditor() {
  // Text state
  const [text, setText] = useState("HEADING")
  const [fontFamily, setFontFamily] = useState("Inter")
  const [showFontSize, setShowFontSize] = useState(false)
  const [fontSize, setFontSize] = useState(200)
  const [fontWeight, setFontWeight] = useState(500)
  const [availableWeights, setAvailableWeights] = useState<number[]>([400])
  const [lineHeight, setLineHeight] = useState<ValueWithUnit>({ value: 1.0, unit: "" })
  const [letterSpacing, setLetterSpacing] = useState<ValueWithUnit>({ value: 0, unit: "px" })

  // SVG state
  const [svgCode, setSvgCode] = useState("")
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Handle font weight changes
  const handleFontWeightsChange = (weights: number[]) => {
    setAvailableWeights(weights.sort((a, b) => a - b))
    // If current weight is not available, switch to closest available weight
    if (!weights.includes(fontWeight)) {
      const closestWeight = weights.reduce((prev, curr) => 
        Math.abs(curr - fontWeight) < Math.abs(prev - fontWeight) ? curr : prev
      )
      setFontWeight(closestWeight)
    }
  }

  // Handle font weight selection
  const handleFontWeightChange = (value: string) => {
    const newWeight = Number(value)
    if (!availableWeights.includes(newWeight)) {
      // If weight is not available, find the closest available weight
      const closestWeight = availableWeights.reduce((prev, curr) => 
        Math.abs(curr - newWeight) < Math.abs(prev - newWeight) ? curr : prev
      )
      setFontWeight(closestWeight)
    } else {
      setFontWeight(newWeight)
    }
  }

  // Copy SVG code to clipboard
  const copyToClipboard = async () => {
    if (svgCode) {
      await navigator.clipboard.writeText(svgCode)
    }
  }

  useEffect(() => {

    // Wait for next frame to ensure SVG has updated
    requestAnimationFrame(() => {
      const svg = svgRef.current
      if (!svg) return
      const viewBox = svg.viewBox.baseVal
      setDimensions({
        width: Math.round(viewBox.width),
        height: Math.round(viewBox.height),
      })

      // Add proper indentation and format
      const formattedSvgData = svg.outerHTML
        .replace(/>\s+</g, ">\n<")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/<svg/g, "\n<svg")
        .replace(/<foreignObject/g, "\n  <foreignObject")
        .replace(/<div/g, "\n    <div")
        .replace(/<\/div>/g, "</div>\n  ")
        .replace(/<\/foreignObject>/g, "</foreignObject>\n")
        .replace(/<\/svg>/g, "</svg>\n")

      setSvgCode(formattedSvgData)
    })
  }, [text, fontSize, lineHeight, letterSpacing, fontFamily, fontWeight])

  return (
    <div className="min-h-screen bg-zinc-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">SVG Text Editor</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="border-0 shadow-lg dark:shadow-slate-900/50 p-1 bg-zinc-900 ring-1 ring-white/15 rounded-2xl">
              <CardHeader className="">
                <CardTitle className="text-xl text-slate-800 dark:text-slate-200">Text & Font</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6 dark:bg-zinc-950 ring-1 ring-white/20 rounded-xl">
                <div className="space-y-3">
                  <Label htmlFor="text">Text</Label>
                  <ValidatedInput
                    id="text"
                    value={text}
                    onChange={(value: string | number) => setText(value.toString())}
                    validate={(value: string | number) => value.toString().length > 0}
                    placeholder="Enter text"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <FontSelector 
                    value={fontFamily} 
                    onChange={setFontFamily}
                    onWeightsChange={handleFontWeightsChange}
                  />
                </div>

                <div className="flex items-center justify-between py-2 px-1">
                  <Label>Show Font Size</Label>
                  <Switch checked={showFontSize} onCheckedChange={setShowFontSize} />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="fontWeight">Font Weight</Label>
                  <Select 
                    value={fontWeight.toString()} 
                    onValueChange={handleFontWeightChange}
                  >
                    <SelectTrigger
                      id="fontWeight"
                    >
                      <SelectValue placeholder="Select weight">
                        {fontWeight}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {availableWeights.map((weight) => (
                        <SelectItem
                          key={weight}
                          value={weight.toString()}
                          className="font-['Inter']"
                          style={{ fontWeight: weight }}
                        >
                          {weight === 400 ? "Regular" : weight === 500 ? "Medium" : weight === 600 ? "Semi Bold" : weight === 700 ? "Bold" : weight === 800 ? "Extra Bold" : weight === 900 ? "Black" : weight === 300 ? "Light" : weight === 200 ? "Extra Light" : "Thin"} ({weight})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showFontSize && (
                  <div className="space-y-3">
                    <Label htmlFor="fontSize">Font Size (px)</Label>
                    <ValidatedInput
                      id="fontSize"
                      type="number"
                      value={fontSize}
                      onChange={(value: string | number) => setFontSize(Number(value))}
                      validate={(value: string | number) => {
                        const num = Number(value)
                        return !isNaN(num) && num >= 1 && num <= 1000
                      }}
                      min={1}
                      max={1000}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="lineHeight">Line Height</Label>
                  <UnitInput
                    id="lineHeight"
                    value={lineHeight}
                    onChange={setLineHeight}
                    min={0}
                    max={10}
                    allowedUnits={["", "px", "em", "rem", "%"]}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="letterSpacing">Letter Spacing</Label>
                  <UnitInput
                    id="letterSpacing"
                    value={letterSpacing}
                    onChange={setLetterSpacing}
                    min={-50}
                    max={50}
                    allowedUnits={["px", "em", "rem", "%", "ch"]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-zinc-900 ring-1 ring-white/15 rounded-2xl p-1">
              <CardHeader className="">
                <CardTitle className="text-xl text-slate-800 dark:text-slate-200">Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-6 ring-white/20 ring-1 rounded-xl bg-zinc-950">
                <div className="w-full overflow-hidden rounded-lg bg-white dark:bg-slate-800 p-6 shadow-inner">
                  <div className="rounded-lg outline-1 outline-dashed outline-slate-400">
                    <FitText
                      ref={svgRef}
                      text={text}
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      fontWeight={fontWeight}
                      lineHeight={lineHeight}
                      letterSpacing={letterSpacing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg dark:shadow-slate-900/50 p-1 bg-zinc-900 ring-1 ring-white/15 rounded-2xl">
              <CardHeader className="">
                <CardTitle className="text-xl text-slate-800 dark:text-slate-200">SVG Code</CardTitle>
              </CardHeader>
              <CardContent className="p-6 ring-white/20 ring-1 rounded-xl bg-zinc-950">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="absolute right-2 top-2 z-10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="overflow-auto rounded-lg bg-zinc-900 p-4 text-sm text-slate-50 font-mono max-h-[400px]">
                    <code>{svgCode}</code>
                  </pre>
                  <div className="mt-4 text-sm text-slate-400 font-medium">
                    Dimensions: {dimensions.width} × {dimensions.height} px
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
