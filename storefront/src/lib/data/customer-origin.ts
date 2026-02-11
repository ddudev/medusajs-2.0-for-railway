"use server"

import { getFirstTouchOrigin } from "./cookies"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Sends first-touch origin from cookie to backend (cart and/or customer metadata).
 * Call after cart create, order complete, or registration.
 */
export async function sendCustomerOriginToBackend(params: {
  cart_id?: string
  customer_id?: string
}): Promise<void> {
  const origin = await getFirstTouchOrigin()
  if (!origin || Object.keys(origin).length === 0) return

  const body: Record<string, string> = {}
  if (params.cart_id) body.cart_id = params.cart_id
  if (params.customer_id) body.customer_id = params.customer_id
  if (origin.origin_type) body.origin_type = origin.origin_type
  if (origin.utm_source) body.utm_source = origin.utm_source
  if (origin.utm_medium) body.utm_medium = origin.utm_medium
  if (origin.utm_campaign) body.utm_campaign = origin.utm_campaign
  if (origin.utm_term) body.utm_term = origin.utm_term
  if (origin.utm_content) body.utm_content = origin.utm_content
  if (origin.gclid) body.gclid = origin.gclid
  if (origin.fbclid) body.fbclid = origin.fbclid
  if (origin.referrer) body.referrer = origin.referrer

  if (!params.cart_id && !params.customer_id) return

  try {
    const res = await fetch(`${BACKEND_URL}/store/customer-origin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn("[Customer origin] Backend returned", res.status, await res.text())
    }
  } catch (e) {
    console.warn("[Customer origin] Failed to send:", e)
  }
}
