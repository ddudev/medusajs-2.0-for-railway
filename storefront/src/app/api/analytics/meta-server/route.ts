/**
 * API route for server-side Meta CAPI events (deduplication with Pixel).
 * Accepts any event_name + event_id + event_source_url + custom_data.
 * Same event_id must be sent from client fbq('track', ..., { eventID }).
 */

import { NextRequest, NextResponse } from "next/server"
import { sendMetaEventServer, getClientIp, extractFacebookCookies } from "@lib/analytics/server-meta"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_name, event_id, event_source_url, custom_data } = body

    if (!event_name || !event_id || !event_source_url) {
      return NextResponse.json(
        { success: false, error: "event_name, event_id, event_source_url required" },
        { status: 400 }
      )
    }

    // Purchase is sent only from /api/analytics/conversions (one server-side Purchase per order)
    if (event_name === "Purchase") {
      return NextResponse.json({ success: true })
    }

    const clientIp = await getClientIp(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined
    const cookieHeader = request.headers.get("cookie")
    const { fbc, fbp } = await extractFacebookCookies(cookieHeader || "")

    await sendMetaEventServer({
      event_name,
      event_id,
      event_source_url,
      custom_data: custom_data ?? undefined,
      user_data: { fbc, fbp, clientIp, userAgent },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn("Meta server event failed:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
