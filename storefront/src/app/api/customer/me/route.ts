import { getCustomer } from "@lib/data/customer"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/customer/me
 * Server-side API route to get the current authenticated customer
 * This wraps the server-side getCustomer() function so Client Components can call it
 * 
 * Uses the same getCustomer() function that works in the account page layout
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomer()
    
    if (!customer) {
      return NextResponse.json({ customer: null }, { status: 404 })
    }
    
    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    )
  }
}
