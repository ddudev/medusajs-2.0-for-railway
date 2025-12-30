"use client"

import { useEffect, useState } from "react"
import FreeShippingProgress from "./index"
import { FreeShippingEligibility } from "@lib/data/free-shipping"

type FreeShippingProgressWrapperProps = {
  cartId: string | null
  variant?: "default" | "compact"
}

export default function FreeShippingProgressWrapper({
  cartId,
  variant = "default",
}: FreeShippingProgressWrapperProps) {
  const [eligibility, setEligibility] = useState<FreeShippingEligibility | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cartId) {
      setEligibility(null)
      setLoading(false)
      return
    }

    // Fetch eligibility directly from API (client-side fetch)
    const fetchEligibility = async () => {
      setLoading(true)
      try {
        const BACKEND_URL =
          process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          "http://localhost:9000"

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }
        const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
        if (publishableKey) {
          headers["x-publishable-api-key"] = publishableKey
        }

        const response = await fetch(
          `${BACKEND_URL}/store/free-shipping-eligibility?cart_id=${cartId}`,
          {
            headers,
            credentials: "include",
            cache: "no-store", // Always fetch fresh data
          }
        )

        if (!response.ok) {
          console.error(`Failed to fetch free shipping eligibility: ${response.status} ${response.statusText}`)
          setEligibility(null)
          return
        }

        const data: FreeShippingEligibility = await response.json()
        console.log("Free shipping eligibility data:", data) // Debug log
        setEligibility(data)
      } catch (error) {
        console.error("Error fetching free shipping eligibility:", error)
        setEligibility(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEligibility()

    // Re-fetch when cart ID changes (debounce would be better, but this works)
    const timeoutId = setTimeout(fetchEligibility, 500)
    return () => clearTimeout(timeoutId)
  }, [cartId])

  if (loading) {
    return null // Don't show loading state, just hide until ready
  }

  return <FreeShippingProgress eligibility={eligibility} variant={variant} />
}

