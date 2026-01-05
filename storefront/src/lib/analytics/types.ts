/**
 * TypeScript types for PostHog analytics
 */

export interface ProductEventProperties {
  product_id: string
  product_name: string
  product_price?: number
  product_category?: string
  currency?: string
  variant_id?: string
  variant_name?: string
  quantity?: number
}

export interface CartEventProperties {
  cart_value: number
  item_count: number
  currency: string
  cart_id?: string
  items?: Array<{
    product_id: string
    variant_id: string
    quantity: number
    price: number
  }>
}

export interface CheckoutEventProperties {
  cart_value: number
  item_count: number
  currency: string
  cart_id?: string
  step_name?: string
  shipping_method?: string
  shipping_price?: number
  payment_method?: string
}

export interface PurchaseEventProperties {
  order_id: string
  order_total: number
  currency: string
  items: Array<{
    product_id: string
    variant_id: string
    quantity: number
    price: number
  }>
  shipping_method?: string
  payment_method?: string
  customer_id?: string
  is_new_customer?: boolean
  is_guest_purchase?: boolean
}

export interface UserProperties {
  email?: string
  name?: string
  country_code?: string
  registration_date?: string
  total_orders?: number
  total_spent?: number
  average_order_value?: number
  last_order_date?: string
  customer_segment?: 'new' | 'returning' | 'vip'
}
