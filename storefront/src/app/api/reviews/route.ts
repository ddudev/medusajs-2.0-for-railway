import { getAuthHeaders } from "@lib/data/cookies"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:9000"

const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

/**
 * POST /api/reviews
 * Server-side API route to submit a product review
 * This wraps the backend API call so Client Components can submit reviews with proper authentication
 * 
 * The server-side route can access httpOnly cookies for authentication
 */
export async function POST(request: NextRequest) {
  try {
    const authHeaders = await getAuthHeaders()
    
    // If no auth headers (no token), return unauthorized
    if (!authHeaders || !('authorization' in authHeaders)) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in to submit a review" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.content || !body.rating || !body.product_id) {
      return NextResponse.json(
        { error: "Missing required fields: content, rating, product_id" },
        { status: 400 }
      )
    }

    // Build request headers with publishable API key and authentication
    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...authHeaders,
    }
    
    if (PUBLISHABLE_API_KEY) {
      requestHeaders["x-publishable-api-key"] = PUBLISHABLE_API_KEY
    }

    // Make authenticated request to backend using regular fetch for better control
    const response = await fetch(`${BACKEND_URL}/store/reviews`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body), // Stringify once, explicitly
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `Failed to submit review: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error submitting review:", error)
    
    // Handle specific error cases
    if (error.status === 401 || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in to submit a review" },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: error.status || 500 }
    )
  }
}
