"use client"

import { useEffect } from "react"

const COOKIE_NAME = "first_touch_origin"
const COOKIE_MAX_AGE_DAYS = 365

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function computeOrigin(): Record<string, string> | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const utm_source = params.get("utm_source") ?? ""
  const utm_medium = params.get("utm_medium") ?? ""
  const utm_campaign = params.get("utm_campaign") ?? ""
  const utm_term = params.get("utm_term") ?? ""
  const utm_content = params.get("utm_content") ?? ""
  const gclid = params.get("gclid") ?? ""
  const fbclid = params.get("fbclid") ?? ""
  const referrer = document.referrer || ""

  const origin_type =
    gclid
      ? "google_ads"
      : fbclid || utm_source?.toLowerCase() === "facebook" || utm_source?.toLowerCase() === "fb"
        ? "meta"
        : utm_source
          ? (utm_source as string)
          : referrer
            ? "organic"
            : "direct"

  const payload: Record<string, string> = { origin_type }
  if (utm_source) payload.utm_source = utm_source
  if (utm_medium) payload.utm_medium = utm_medium
  if (utm_campaign) payload.utm_campaign = utm_campaign
  if (utm_term) payload.utm_term = utm_term
  if (utm_content) payload.utm_content = utm_content
  if (gclid) payload.gclid = gclid
  if (fbclid) payload.fbclid = fbclid
  if (referrer) payload.referrer = referrer

  return payload
}

/**
 * Captures first-touch attribution (utm_*, gclid, fbclid, referrer) on first visit
 * and stores it in a cookie so the server can send it on cart create, order, register.
 */
export function FirstTouchOriginCapture() {
  useEffect(() => {
    const existing = getCookie(COOKIE_NAME)
    if (existing) return

    const payload = computeOrigin()
    if (!payload || Object.keys(payload).length === 0) return

    setCookie(COOKIE_NAME, JSON.stringify(payload))
  }, [])

  return null
}
