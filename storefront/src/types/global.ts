export type FeaturedProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
}

export type StoreProductReview = {
  id: string
  title?: string
  rating: number
  content: string
  first_name: string
  last_name: string
  created_at: string | Date
}

import { PriceParts } from "@lib/util/money"

export type VariantPrice = {
  calculated_price_number: number
  calculated_price: string
  calculated_price_parts?: PriceParts
  original_price_number: number
  original_price: string
  original_price_parts?: PriceParts
  currency_code: string
  price_type: string
  percentage_diff: string
}
