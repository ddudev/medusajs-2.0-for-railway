import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:9000"

const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

/**
 * GET /api/econt/cities
 * Proxy request to backend Econt cities endpoint (server-side)
 */
export async function GET(request: NextRequest) {
  try {
    if (!PUBLISHABLE_API_KEY) {
      return NextResponse.json(
        { message: "Publishable API key not configured" },
        { status: 500 }
      )
    }

    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: "Backend URL not configured" },
        { status: 500 }
      )
    }

    // Extract search query from URL (use nextUrl to avoid prerendering issues)
    const searchQuery = request.nextUrl.searchParams.get("q")
    const queryParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""
    
    const backendUrl = `${BACKEND_URL}/store/econt/cities${queryParam}`

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      // Server-side fetch - credentials are never exposed to client
      cache: "no-store", // Don't cache errors
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Try to parse as JSON, otherwise return as text
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          { message: errorJson.message || errorText },
          { status: response.status }
        )
      } catch(error: any) {
        return NextResponse.json(
          { message: errorText || "Failed to fetch cities" },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch cities"
    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}

