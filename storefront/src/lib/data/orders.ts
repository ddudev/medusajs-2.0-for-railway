"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { getAuthHeaders } from "./cookies"

/**
 * Retrieve a single order by id.
 * Works with or without auth: guests can load the order confirmation page after checkout
 * (Medusa store Get Order by ID does not require authentication; order id is the secret).
 * Logged-in customers can also use this; auth headers are passed when available.
 */
export const retrieveOrder = cache(async function (id: string) {
  const authHeaders = await getAuthHeaders()
  const headers = authHeaders && "authorization" in authHeaders ? authHeaders : {}
  return sdk.store.order
    .retrieve(
      id,
      { fields: "*payment_collections.payments" },
      { next: { tags: ["order"] }, ...headers }
    )
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
})

export const listOrders = cache(async function (
  limit: number = 10,
  offset: number = 0
) {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders || !("authorization" in authHeaders)) {
    throw new Error("Unauthorized")
  }
  return sdk.store.order
    .list({ limit, offset }, { next: { tags: ["order"] }, ...authHeaders })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
})
