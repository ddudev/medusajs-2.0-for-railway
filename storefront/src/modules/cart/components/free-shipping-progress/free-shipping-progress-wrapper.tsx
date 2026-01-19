"use client"

import FreeShippingProgress from "./index"
import { useFreeShipping } from "@lib/hooks/use-promotions"

type FreeShippingProgressWrapperProps = {
  variant?: "default" | "compact"
}

export default function FreeShippingProgressWrapper({
  variant = "default",
}: FreeShippingProgressWrapperProps) {
  // Use TanStack Query hook - automatically cached and updated
  const { data: eligibility, isLoading } = useFreeShipping()

  if (isLoading) {
    return null // Don't show loading state, just hide until ready
  }

  return <FreeShippingProgress eligibility={eligibility || null} variant={variant} />
}

