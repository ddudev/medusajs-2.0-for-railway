import { Metadata } from "next"

import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { notFound } from "next/navigation"
import { enrichLineItems } from "@lib/data/cart"
import { retrieveOrder } from "@lib/data/orders"
import { OrderConfirmedTracker } from "@lib/analytics/order-confirmed-tracker"
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

  // Single event_id for server + client so Meta/GA4 can deduplicate
  const { generateEventId } = await import("@lib/analytics/privacy")
  const eventId = generateEventId()

  // Track order confirmation page view (server-side)
  try {
    // Import server-side tracking functions (Meta Purchase is sent only from client via /api/analytics/conversions)
    const { trackOrderConfirmed } = await import("@lib/analytics/server")
    const { trackGA4Purchase, generateClientId } = await import("@lib/analytics/server-gtm")

    const orderTotal = order.total ? Number(order.total) : 0
    const itemsCount = order.items?.length || 0

    // Track to PostHog (existing)
    await trackOrderConfirmed(
      order.id,
      orderTotal,
      itemsCount,
      order.customer_id || undefined,
      order.email || undefined
    )
    
    // Prepare items for GTM
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
  } catch (error) {
    // Don't block page render if analytics fails
    console.error("Failed to track order confirmation:", error)
  }

  // Client-side purchase event for GTM + Meta Pixel + PostHog (thank-you page view)
  // event_id is passed so client can send same id to conversions API for server-side + dedup
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  const shippingAddress = order.shipping_address
  const billingAddress = order.billing_address
  const purchasePayload = {
    transaction_id: order.id,
    value: order.total ? Number(order.total) : 0,
    currency: order.currency_code || "EUR",
    tax: order.tax_total ? Number(order.tax_total) : undefined,
    shipping: order.shipping_total ? Number(order.shipping_total) : undefined,
    customer_id: order.customer_id || undefined,
    event_id: eventId,
    event_source_url: baseUrl ? `${baseUrl.replace(/\/$/, "")}/order/confirmed/${order.id}` : "",
    items: (order.items || []).map((item: any) => ({
      item_id: item.product_id || item.variant_id || "",
      item_name: item.title || item.product_title || "",
      item_variant: item.variant_id,
      price: item.unit_price ? Number(item.unit_price) : 0,
      quantity: item.quantity || 0,
      product_id: item.product_id,
      variant_id: item.variant_id,
    })),
    email: order.email || undefined,
    phone: shippingAddress?.phone || billingAddress?.phone || undefined,
    first_name: shippingAddress?.first_name || billingAddress?.first_name || undefined,
    last_name: shippingAddress?.last_name || billingAddress?.last_name || undefined,
    city: shippingAddress?.city || billingAddress?.city || undefined,
    region: shippingAddress?.province || billingAddress?.province || undefined,
    postal_code: shippingAddress?.postal_code || billingAddress?.postal_code || undefined,
    country: shippingAddress?.country_code || billingAddress?.country_code || undefined,
  }

  return (
    <>
      <OrderConfirmedTracker order={purchasePayload} />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
