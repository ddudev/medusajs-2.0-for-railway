/**
 * Google Tag Manager event tracking functions
 * Implements GA4 e-commerce event format
 */

import { pushToDataLayer } from './gtm-provider'

/**
 * GA4 Item structure
 */
export interface GTMItem {
  item_id: string
  item_name: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_category4?: string
  item_variant?: string
  price: number
  quantity: number
  currency?: string
  discount?: number
  index?: number
  item_list_name?: string
  item_list_id?: string
}

/**
 * Track product view (view_item)
 */
export function trackGTMProductView(params: {
  currency: string
  value: number
  items: GTMItem[]
}) {
  pushToDataLayer('view_item', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  })
}

/**
 * Track product list view (view_item_list)
 */
export function trackGTMProductListView(params: {
  item_list_id?: string
  item_list_name?: string
  items: GTMItem[]
}) {
  pushToDataLayer('view_item_list', {
    ecommerce: {
      item_list_id: params.item_list_id,
      item_list_name: params.item_list_name,
      items: params.items,
    },
  })
}

/**
 * Track add to cart (add_to_cart)
 */
export function trackGTMAddToCart(params: {
  currency: string
  value: number
  items: GTMItem[]
}) {
  pushToDataLayer('add_to_cart', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  })
}

/**
 * Track remove from cart (remove_from_cart)
 */
export function trackGTMRemoveFromCart(params: {
  currency: string
  value: number
  items: GTMItem[]
}) {
  pushToDataLayer('remove_from_cart', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  })
}

/**
 * Track view cart (view_cart)
 */
export function trackGTMViewCart(params: {
  currency: string
  value: number
  items: GTMItem[]
}) {
  pushToDataLayer('view_cart', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  })
}

/**
 * Track begin checkout (begin_checkout)
 */
export function trackGTMBeginCheckout(params: {
  currency: string
  value: number
  coupon?: string
  items: GTMItem[]
}) {
  pushToDataLayer('begin_checkout', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      coupon: params.coupon,
      items: params.items,
    },
  })
}

/**
 * Track add shipping info (add_shipping_info)
 */
export function trackGTMAddShippingInfo(params: {
  currency: string
  value: number
  coupon?: string
  shipping_tier?: string
  items: GTMItem[]
}) {
  pushToDataLayer('add_shipping_info', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      coupon: params.coupon,
      shipping_tier: params.shipping_tier,
      items: params.items,
    },
  })
}

/**
 * Track add payment info (add_payment_info)
 */
export function trackGTMAddPaymentInfo(params: {
  currency: string
  value: number
  coupon?: string
  payment_type?: string
  items: GTMItem[]
}) {
  pushToDataLayer('add_payment_info', {
    ecommerce: {
      currency: params.currency,
      value: params.value,
      coupon: params.coupon,
      payment_type: params.payment_type,
      items: params.items,
    },
  })
}

/**
 * Track purchase (purchase)
 */
export function trackGTMPurchase(params: {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  coupon?: string
  items: GTMItem[]
  // Enhanced conversion data
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  city?: string
  region?: string
  postal_code?: string
  country?: string
}) {
  pushToDataLayer('purchase', {
    ecommerce: {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency,
      tax: params.tax,
      shipping: params.shipping,
      coupon: params.coupon,
      items: params.items,
    },
    // User data for enhanced conversions
    user_data: params.email || params.phone ? {
      email: params.email,
      phone_number: params.phone,
      address: {
        first_name: params.first_name,
        last_name: params.last_name,
        city: params.city,
        region: params.region,
        postal_code: params.postal_code,
        country: params.country,
      },
    } : undefined,
  })
}

/**
 * Track search (search)
 */
export function trackGTMSearch(params: {
  search_term: string
  results_count?: number
}) {
  pushToDataLayer('search', {
    search_term: params.search_term,
    results_count: params.results_count,
  })
}

/**
 * Track user sign up (sign_up)
 */
export function trackGTMSignUp(params: {
  method?: string
  email?: string
  phone?: string
}) {
  pushToDataLayer('sign_up', {
    method: params.method || 'email',
    user_data: params.email || params.phone ? {
      email: params.email,
      phone_number: params.phone,
    } : undefined,
  })
}

/**
 * Track user login (login)
 */
export function trackGTMLogin(params: {
  method?: string
  user_id?: string
}) {
  pushToDataLayer('login', {
    method: params.method || 'email',
    user_id: params.user_id,
  })
}

/**
 * Track custom event
 */
export function trackGTMCustomEvent(
  eventName: string,
  parameters?: Record<string, any>
) {
  pushToDataLayer(eventName, parameters)
}

/**
 * Set user ID for GTM
 */
export function setGTMUserId(userId: string) {
  pushToDataLayer('user_id_set', {
    user_id: userId,
  })
}

/**
 * Set user properties for GTM
 */
export function setGTMUserProperties(properties: {
  email?: string
  phone?: string
  customer_id?: string
  customer_segment?: string
  lifetime_value?: number
}) {
  pushToDataLayer('user_properties_set', {
    user_properties: properties,
  })
}
