"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_STARS = 5

interface RatingProps {
  value: number
  readOnly?: boolean
  precision?: 0.5 | 1
  size?: "small" | "medium" | "large"
  onChange?: (value: number | null) => void
  className?: string
}

const sizeClasses = {
  small: "h-4 w-4",
  medium: "h-5 w-5",
  large: "h-6 w-6",
}

export function Rating({
  value,
  readOnly = true,
  precision = 0.5,
  size = "medium",
  onChange,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const displayValue = hoverValue ?? value
  const sizeClass = sizeClasses[size]

  const handleClick = (index: number) => {
    if (readOnly || !onChange) return
    const next = index + 1 // 1-5 for full star
    onChange(next === value ? null : next)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (readOnly || !onChange) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const next = index + 1
      onChange(next === value ? null : next)
    }
  }

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "slider"}
      aria-label={readOnly ? `Rating: ${value} out of ${MAX_STARS}` : undefined}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const starValue = i + 1
        const filled = displayValue >= starValue
        const half = precision === 0.5 && displayValue >= i + 0.5 && displayValue < starValue
        return (
          <span
            key={i}
            className={cn(
              "inline-flex cursor-default text-[#e5e7eb] transition-colors",
              (filled || half) && "text-[#FFD700]",
              !readOnly && "cursor-pointer hover:opacity-90"
            )}
            onMouseEnter={() => !readOnly && setHoverValue(i + (precision === 0.5 ? 0.5 : 1))}
            onMouseLeave={() => !readOnly && setHoverValue(null)}
            onClick={() => handleClick(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            tabIndex={readOnly ? undefined : 0}
            role={readOnly ? undefined : "button"}
          >
            <Star
              className={cn(sizeClass, half && "fill-[#FFD700]")}
              fill={filled ? "currentColor" : half ? "currentColor" : "none"}
            />
          </span>
        )
      })}
    </span>
  )
}
