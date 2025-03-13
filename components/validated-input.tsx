import React, { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Check, AlertCircle } from "lucide-react"

interface ValidatedInputProps {
  value: string | number
  onChange: (value: string | number) => void
  validate: (value: string | number) => boolean
  className?: string
  type?: string
  id?: string
  placeholder?: string
  min?: number
  max?: number
}

export function ValidatedInput({
  value,
  onChange,
  validate,
  className = "",
  type = "text",
  ...props
}: ValidatedInputProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof ValidatedInputProps>) {
  const [localValue, setLocalValue] = useState(value.toString())
  const [isEditing, setIsEditing] = useState(false)
  const [isValid, setIsValid] = useState(true)

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    setIsEditing(true)
    setIsValid(validate(type === "number" ? Number(newValue) : newValue))
  }, [validate, type])

  // Handle blur and enter key
  const handleFinishEdit = useCallback(() => {
    if (isValid) {
      onChange(type === "number" ? Number(localValue) : localValue)
    } else {
      setLocalValue(value.toString())
    }
    setIsEditing(false)
  }, [isValid, localValue, value, onChange, type])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishEdit()
    } else if (e.key === "Escape") {
      setLocalValue(value.toString())
      setIsEditing(false)
      setIsValid(true)
    }
  }, [handleFinishEdit, value])

  return (
    <div className="relative">
      <Input
        {...props}
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleFinishEdit}
        onKeyDown={handleKeyDown}
        className={`${className} ${
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
  )
}
