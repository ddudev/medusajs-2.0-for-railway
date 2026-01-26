/**
 * Meta Pixel event tracking functions
 * Implements Meta Pixel Standard Events
 * Reference: https://developers.facebook.com/docs/meta-pixel/reference
 */

import { trackMetaEvent, trackMetaCustomEvent } from './meta-pixel-provider'

/**
 * Meta Pixel Content Type
 */
export type MetaContentType = 'product' | 'product_group'

/**
 * Meta Pixel Content structure
 */
export interface MetaContent {
  id: string
  quantity: number
  item_price?: number
}

/**
 * Track product view (ViewContent)
 */
export function trackMetaViewContent(params: {
  content_ids: string[]
  content_name: string
  content_type: MetaContentType
  content_category?: string
  currency: string
  value: number
  contents?: MetaContent[]
}) {
  trackMetaEvent('ViewContent', {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_type: params.content_type,
    content_category: params.content_category,
    currency: params.currency,
    value: params.value,
    contents: params.contents,
  })
}

/**
 * Track add to cart (AddToCart)
 */
export function trackMetaAddToCart(params: {
  content_ids: string[]
  content_name: string
  content_type: MetaContentType
  currency: string
  value: number
  contents?: MetaContent[]
}) {
  trackMetaEvent('AddToCart', {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_type: params.content_type,
    currency: params.currency,
    value: params.value,
    contents: params.contents,
  })
}

/**
 * Track checkout initiation (InitiateCheckout)
 */
export function trackMetaInitiateCheckout(params: {
  content_ids: string[]
  content_category?: string
  currency: string
  value: number
  num_items: number
  contents?: MetaContent[]
}) {
  trackMetaEvent('InitiateCheckout', {
    content_ids: params.content_ids,
    content_category: params.content_category,
    currency: params.currency,
    value: params.value,
    num_items: params.num_items,
    contents: params.contents,
  })
}

/**
 * Track add payment info (AddPaymentInfo)
 */
export function trackMetaAddPaymentInfo(params: {
  content_ids: string[]
  currency: string
  value: number
  contents?: MetaContent[]
}) {
  trackMetaEvent('AddPaymentInfo', {
    content_ids: params.content_ids,
    currency: params.currency,
    value: params.value,
    contents: params.contents,
  })
}

/**
 * Track purchase (Purchase)
 */
export function trackMetaPurchase(params: {
  content_ids: string[]
  content_name?: string
  content_type: MetaContentType
  currency: string
  value: number
  num_items?: number
  contents?: MetaContent[]
  // Additional purchase data
  order_id?: string
  // For deduplication with server-side events
  event_id?: string
}) {
  trackMetaEvent('Purchase', {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_type: params.content_type,
    currency: params.currency,
    value: params.value,
    num_items: params.num_items,
    contents: params.contents,
    order_id: params.order_id,
    // Event ID for deduplication
    eventID: params.event_id,
  })
}

/**
 * Track search (Search)
 */
export function trackMetaSearch(params: {
  search_string: string
  content_ids?: string[]
  content_category?: string
  currency?: string
  value?: number
}) {
  trackMetaEvent('Search', {
    search_string: params.search_string,
    content_ids: params.content_ids,
    content_category: params.content_category,
    currency: params.currency,
    value: params.value,
  })
}

/**
 * Track registration completion (CompleteRegistration)
 */
export function trackMetaCompleteRegistration(params: {
  status?: string
  content_name?: string
  currency?: string
  value?: number
}) {
  trackMetaEvent('CompleteRegistration', {
    status: params.status || 'success',
    content_name: params.content_name,
    currency: params.currency,
    value: params.value,
  })
}

/**
 * Track lead (Lead)
 * Use this for email/phone capture
 */
export function trackMetaLead(params: {
  content_name: string
  content_category?: string
  currency?: string
  value?: number
  // Lead source
  lead_source?: 'registration' | 'checkout' | 'newsletter' | 'contact' | 'account'
}) {
  trackMetaEvent('Lead', {
    content_name: params.content_name,
    content_category: params.content_category,
    currency: params.currency,
    value: params.value,
    lead_source: params.lead_source,
  })
}

/**
 * Track contact form submission (Contact)
 */
export function trackMetaContact(params: {
  content_name?: string
  content_category?: string
}) {
  trackMetaEvent('Contact', {
    content_name: params.content_name,
    content_category: params.content_category,
  })
}

/**
 * Track newsletter subscription (custom event)
 */
export function trackMetaNewsletterSignup(params: {
  email?: string
  source?: 'homepage' | 'footer'
}) {
  trackMetaCustomEvent('NewsletterSignup', {
    source: params.source,
  })
}

/**
 * Track wishlist add (AddToWishlist) - if you implement wishlist
 */
export function trackMetaAddToWishlist(params: {
  content_ids: string[]
  content_name: string
  content_category?: string
  currency: string
  value: number
}) {
  trackMetaEvent('AddToWishlist', {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_category: params.content_category,
    currency: params.currency,
    value: params.value,
  })
}

/**
 * Helper: Convert cart/order items to Meta content format
 */
export function convertToMetaContents(items: Array<{
  id: string
  quantity: number
  price: number
}>): MetaContent[] {
  return items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    item_price: item.price,
  }))
}

/**
 * Helper: Extract content IDs from items
 */
export function extractContentIds(items: Array<{ id?: string; product_id?: string; variant_id?: string }>): string[] {
  return items
    .map(item => item.id || item.product_id || item.variant_id)
    .filter(Boolean) as string[]
}
