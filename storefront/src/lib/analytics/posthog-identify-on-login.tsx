"use client"

import { useEffect, useRef } from "react"
import { useAnalytics } from "./use-analytics"

const GUEST_ID_COOKIE = "_storefront_guest_id"
const GUEST_ID_MAX_AGE_DAYS = 365

function getOrCreateGuestId(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(new RegExp(`(?:^|; )${GUEST_ID_COOKIE}=([^;]*)`))
  if (match?.[1]) return match[1]
  const id = crypto.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  document.cookie = `${GUEST_ID_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * GUEST_ID_MAX_AGE_DAYS}; samesite=lax${location?.protocol === "https:" ? "; secure" : ""}`
  return id
}

/**
 * Minimal customer shape for identification (avoids pulling in full HttpTypes).
 * Used so the root layout can pass customer from getCustomer() without importing store types here.
 */
export interface IdentifyCustomerShape {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
}

/** Minimal cart shape so layout can pass cart from retrieveCart() without full cart types. */
export interface IdentifyCartShape {
  id: string
}

/**
 * Calls PostHog identify in the browser for both logged-in customers and guests.
 * - Logged-in: identifies with customer.id and person properties (email, name).
 * - Guest with cart: identifies with guest_<cart.id> and is_guest: true (aligns with backend guest profiles).
 * - Guest without cart: creates a persistent guest ID in a cookie and identifies with guest_<id>, is_guest: true.
 *
 * This gives every visitor a stable PostHog person so lifecycle, retention, and funnels work for guests too.
 * Must be rendered inside DeferredAnalyticsWrapper so useAnalytics() has PostHog.
 */
export function PostHogIdentifyOnLogin({
  customer,
  cart,
}: {
  customer: IdentifyCustomerShape | null
  cart?: IdentifyCartShape | null
}) {
  const { identifyUser } = useAnalytics()
  const lastIdentifiedId = useRef<string | null>(null)

  useEffect(() => {
    if (customer?.id) {
      if (lastIdentifiedId.current === customer.id) return
      lastIdentifiedId.current = customer.id
      const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || undefined
      identifyUser(customer.id, {
        email: customer.email ?? undefined,
        name: name || undefined,
      })
      return
    }

    const guestId = cart?.id ? `guest_${cart.id}` : `guest_${getOrCreateGuestId()}`
    if (!guestId || guestId === "guest_") return
    if (lastIdentifiedId.current === guestId) return
    lastIdentifiedId.current = guestId
    identifyUser(guestId, { is_guest: true })
  }, [customer?.id, customer?.email, customer?.first_name, customer?.last_name, cart?.id, identifyUser])

  return null
}
