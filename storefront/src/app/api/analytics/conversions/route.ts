/**
 * API route for server-side conversion tracking
 * Handles purchase events and sends to GA4 and Meta Conversions API
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackGA4Purchase } from '@lib/analytics/server-gtm'
import { trackMetaPurchaseServer, getClientIp, extractFacebookCookies } from '@lib/analytics/server-meta'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      // Order data
      transaction_id,
      value,
      currency,
      tax,
      shipping,
      coupon,
      items,
      num_items,
      
      // Customer data
      email,
      phone,
      first_name,
      last_name,
      city,
      state,
      postal_code,
      country,
      
      // Technical data
      event_id,
      event_source_url,
      customer_id,
      
      // GA4 specific
      client_id,
    } = body

    // Get client IP and user agent from headers
    const clientIp = getClientIp(request.headers)
    const userAgent = request.headers.get('user-agent') || undefined
    
    // Extract Facebook cookies
    const cookieHeader = request.headers.get('cookie')
    const { fbc, fbp } = extractFacebookCookies(cookieHeader || '')

    // Track to GA4 (server-side)
    await trackGA4Purchase({
      client_id: client_id || `server_${Date.now()}`,
      transaction_id,
      value,
      currency,
      tax,
      shipping,
      coupon,
      items: items.map((item: any) => ({
        item_id: item.product_id || item.item_id,
        item_name: item.product_name || item.item_name,
        item_category: item.product_category || item.item_category,
        item_variant: item.variant_id || item.item_variant,
        price: item.price,
        quantity: item.quantity,
      })),
      email,
      phone_number: phone,
      address: {
        first_name,
        last_name,
        city,
        region: state,
        postal_code,
        country,
      },
      user_id: customer_id,
    })

    // Track to Meta Conversions API (server-side)
    await trackMetaPurchaseServer({
      transaction_id,
      value,
      currency,
      contents: items.map((item: any) => ({
        id: item.variant_id || item.product_id || item.item_id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      num_items,
      email,
      phone,
      firstName: first_name,
      lastName: last_name,
      city,
      state,
      postalCode: postal_code,
      country,
      clientIp,
      userAgent,
      eventSourceUrl: event_source_url,
      eventId: event_id,
      fbc,
      fbp,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Conversion tracking error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
