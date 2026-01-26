import { Metadata } from "next"

import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { notFound } from "next/navigation"
import { enrichLineItems } from "@lib/data/cart"
import { retrieveOrder } from "@lib/data/orders"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ id: string }>
}

async function getOrder(id: string) {
  const order = await retrieveOrder(id)

  if (!order) {
    return
  }

  const enrichedItems = await enrichLineItems(order.items, order.region_id!)

  return {
    ...order,
    items: enrichedItems,
  } as unknown as HttpTypes.StoreOrder
}

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage({ params }: Props) {
  // Await params in Next.js 16
  const resolvedParams = await params
  const order = await getOrder(resolvedParams.id)
  if (!order) {
    return notFound()
  }

  // Track order confirmation page view (server-side)
  try {
    // Import server-side tracking functions
    const { trackOrderConfirmed } = await import("@lib/analytics/server")
    const { trackGA4Purchase, generateClientId } = await import("@lib/analytics/server-gtm")
    const { trackMetaPurchaseServer } = await import("@lib/analytics/server-meta")
    const { generateEventId } = await import("@lib/analytics/privacy")
    
    const orderTotal = order.total ? Number(order.total) : 0
    const itemsCount = order.items?.length || 0
    const eventId = generateEventId()
    
    // Track to PostHog (existing)
    await trackOrderConfirmed(
      order.id,
      orderTotal,
      itemsCount,
      order.customer_id || undefined,
      order.email || undefined
    )
    
    // Prepare items for GTM/Meta
    const items = (order.items || []).map((item: any) => ({
      item_id: item.product_id || item.variant_id || '',
      item_name: item.title || item.product_title || '',
      item_category: item.product?.categories?.[0]?.name || '',
      item_variant: item.variant?.title || '',
      price: item.unit_price ? Number(item.unit_price) : 0,
      quantity: item.quantity || 0,
      product_id: item.product_id || '',
      variant_id: item.variant_id || '',
    }))
    
    // Get customer/shipping address data (convert null to undefined for TypeScript)
    const shippingAddress = order.shipping_address
    const billingAddress = order.billing_address
    const email = order.email || undefined
    const phone = shippingAddress?.phone || billingAddress?.phone || undefined
    const firstName = shippingAddress?.first_name || billingAddress?.first_name || undefined
    const lastName = shippingAddress?.last_name || billingAddress?.last_name || undefined
    const city = shippingAddress?.city || billingAddress?.city || undefined
    const state = shippingAddress?.province || billingAddress?.province || undefined
    const postalCode = shippingAddress?.postal_code || billingAddress?.postal_code || undefined
    const country = shippingAddress?.country_code || billingAddress?.country_code || undefined
    
    // Track to GA4 (server-side)
    await trackGA4Purchase({
      client_id: await generateClientId(),
      transaction_id: order.id,
      value: orderTotal,
      currency: order.currency_code || 'EUR',
      tax: order.tax_total ? Number(order.tax_total) : undefined,
      shipping: order.shipping_total ? Number(order.shipping_total) : undefined,
      items,
      email,
      phone_number: phone,
      address: {
        first_name: firstName,
        last_name: lastName,
        city,
        region: state,
        postal_code: postalCode,
        country,
      },
      user_id: order.customer_id || undefined,
    })
    
    // Track to Meta Conversions API (server-side)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:8000'
    await trackMetaPurchaseServer({
      transaction_id: order.id,
      value: orderTotal,
      currency: order.currency_code || 'EUR',
      contents: items.map(item => ({
        id: item.variant_id || item.product_id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      num_items: itemsCount,
      email,
      phone,
      firstName,
      lastName,
      city,
      state,
      postalCode,
      country,
      eventSourceUrl: `${baseUrl}/order/confirmed/${order.id}`,
      eventId,
    })
  } catch (error) {
    // Don't block page render if analytics fails
    console.error("Failed to track order confirmation:", error)
  }

  return <OrderCompletedTemplate order={order} />
}
