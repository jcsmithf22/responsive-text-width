"use client"

import React, { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, AlertCircle } from "lucide-react"
import { Unit, ValueWithUnit } from "@/types"
import { evaluateExpression } from "@/lib/evaluate-expression"

interface UnitInputProps {
  id?: string
  value: ValueWithUnit
  onChange: (value: ValueWithUnit) => void
  min?: number
  max?: number
  allowedUnits?: Unit[]
  className?: string
  compact?: boolean
}

export default function UnitInput({
  id,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  allowedUnits = ["px"],
  className = "",
  compact = false,
}: UnitInputProps) {
  const [localValue, setLocalValue] = useState(value.value.toString())
  const [localUnit, setLocalUnit] = useState<Unit>(value.unit)
  const [isEditing, setIsEditing] = useState(false)
  const [isValid, setIsValid] = useState(true)

  // Validate expression
  const validate = useCallback((expr: string) => {
    try {
      const result = evaluateExpression(expr)
      return !isNaN(result.value) && result.value >= min && result.value <= max
    } catch (err) {
      return false
    }
  }, [min, max])

  // Handle input change
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    setIsEditing(true)
    setIsValid(validate(newValue))
  }, [validate])

  // Handle unit change
  const handleUnitChange = useCallback((unit: Unit) => {
    setLocalUnit(unit)
    if (isValid) {
      try {
        const result = evaluateExpression(localValue)
        onChange({ value: result.value, unit })
      } catch (err) {
        // Keep existing value if expression is invalid
        onChange({ value: value.value, unit })
      }
    }
  }, [onChange, localValue, isValid, value.value])

  // Handle blur and enter key
  const handleFinishEdit = useCallback(() => {
    try {
      const result = evaluateExpression(localValue)
      if (result.value >= min && result.value <= max) {
        // If expression has a unit, use it, otherwise keep current unit
        onChange({ 
          value: result.value,
          unit: result.unit === 'none' ? localUnit : result.unit
        })
        setLocalValue(result.value.toString())
        setLocalUnit(result.unit === 'none' ? localUnit : result.unit)
        setIsValid(true)
      } else {
        setLocalValue(value.value.toString())
        setIsValid(false)
      }
    } catch (err) {
      setLocalValue(value.value.toString())
      setIsValid(false)
    }
    setIsEditing(false)
  }, [localValue, localUnit, min, max, onChange, value.value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishEdit()
    } else if (e.key === "Escape") {
      setLocalValue(value.value.toString())
      setIsEditing(false)
      setIsValid(true)
    }
  }, [handleFinishEdit, value.value])

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          type="text"
          value={localValue}
          onChange={handleValueChange}
          onBlur={handleFinishEdit}
          onKeyDown={handleKeyDown}
          className={`${className} ${compact ? "text-xs h-8 px-2" : ""} ${
            isEditing ? (isValid ? "pr-8 border-green-500" : "pr-8 border-red-500") : ""
          }`}
        />
        {isEditing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      <Select value={localUnit || "none"} onValueChange={handleUnitChange}>
        <SelectTrigger className={`w-20 ${compact ? "text-xs h-8 px-2" : ""}`}>
          <SelectValue placeholder="Unit" />
        </SelectTrigger>
        <SelectContent>
          {allowedUnits.map((unit) => (
            <SelectItem key={unit || "none"} value={unit || "none"}>
              {unit || "none"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
