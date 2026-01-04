import React from "react"
import { convertToLocaleParts, PriceParts } from "@lib/util/money"

type PriceDisplayProps = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
  className?: string
  eurClassName?: string
  bgnClassName?: string
}

/**
 * Component to display price with EUR as primary and BGN in smaller font
 * Per Bulgarian Ministry requirements
 */
export default function PriceDisplay({
  amount,
  currency_code,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale = "en-US",
  className = "",
  eurClassName = "",
  bgnClassName = "text-sm",
}: PriceDisplayProps) {
  const parts = convertToLocaleParts({
    amount,
    currency_code,
    minimumFractionDigits,
    maximumFractionDigits,
    locale,
  })

  return (
    <span className={className}>
      <span className={eurClassName}>{parts.eur}</span>{" "}
      <span className={bgnClassName}>({parts.bgn})</span>
    </span>
  )
}

/**
 * Helper component that accepts PriceParts directly
 */
export function PriceDisplayParts({
  parts,
  className = "",
  eurClassName = "",
  bgnClassName = "text-sm",
}: {
  parts: PriceParts
  className?: string
  eurClassName?: string
  bgnClassName?: string
}) {
  return (
    <span className={className}>
      <span className={eurClassName}>{parts.eur}</span>{" "}
      <span className={bgnClassName}>({parts.bgn})</span>
    </span>
  )
}
