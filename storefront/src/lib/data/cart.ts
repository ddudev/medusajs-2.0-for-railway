"use server"

import { sdk } from "@lib/config"
import medusaError, { getMedusaErrorMessage } from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { omit } from "lodash"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { sendCustomerOriginToBackend } from "./customer-origin"
import { getAuthHeaders, getCartId, removeCartId, setCartId } from "./cookies"
import { getProductsById } from "./products"
import { getRegion } from "./regions"

// Cart is user-specific and should NOT be cached - always dynamic
// DO NOT add "use cache" - cart must be fresh per request
export async function retrieveCart() {
  try {
    const cartId = await getCartId()

    if (!cartId) {
      return null
    }

    const authHeaders = await getAuthHeaders()
    // Fetch cart with full details including:
    // - Line items with variant prices and product data
    // - Payment collection with payment sessions (needed for Stripe/PayPal)
    // - Shipping and billing addresses
    const result = await sdk.store.cart
      .retrieve(
        cartId,
        {
          fields: "+items.*,+items.variant.*,+items.variant.calculated_price,+items.variant.product.*,+payment_collection.*,+payment_collection.payment_sessions.*,+metadata"
        },
        { next: { tags: ["cart"] }, ...authHeaders }
      )
      .then(({ cart }) => cart)
      .catch((error) => {
        console.error("Error retrieving cart:", error)
        return null
      })
    
    return result
  } catch (error) {
    console.error("Error in retrieveCart:", error)
    return null
  }
}

export async function getOrSetCart(countryCode: string) {
  try {
    let cart = await retrieveCart()
    const region = await getRegion(countryCode)

    if (!region) {
      throw new Error(`Region not found for country code: ${countryCode}`)
    }

    if (!cart) {
      const cartResp = await sdk.store.cart.create({ region_id: region.id })
      cart = cartResp.cart
      // Set cart ID cookie - if it fails, continue anyway (cart is still created)
      await setCartId(cart.id).catch((err) => {
        console.warn("Failed to set cart ID cookie, but cart was created:", err)
      })
      revalidateTag("cart", "max")
      await sendCustomerOriginToBackend({ cart_id: cart.id }).catch(() => {})
    }

    if (cart && cart?.region_id !== region.id) {
      const authHeaders = await getAuthHeaders()
      await sdk.store.cart.update(
        cart.id,
        { region_id: region.id },
        {},
        authHeaders
      )
      revalidateTag("cart", "max")
    }

    // Attach first-touch origin to cart metadata (idempotent; backend merges)
    await sendCustomerOriginToBackend({ cart_id: cart.id }).catch(() => {})

    return cart
  } catch (error: any) {
    // Ensure errors are properly handled without closing the connection
    throw new Error(error.message || "Failed to get or create cart")
  }
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const authHeaders = await getAuthHeaders()
  return sdk.store.cart
    .update(cartId, data, {}, authHeaders)
    .then(({ cart }) => {
      // Note: Removed revalidateTag to prevent page refresh during checkout
      // Cart state is managed client-side with CheckoutCartProvider in checkout flow
      // For non-checkout flows, TanStack Query handles cache updates
      return cart
    })
    .catch(medusaError)
}

/** Result type for cart Server Actions so the client can show backend error messages (Next.js strips Error.message in production). */
export type CartActionResult = { success: true } | { success: false; error: string }

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}): Promise<CartActionResult> {
  if (!variantId) {
    return { success: false, error: "Missing variant ID when adding to cart" }
  }

  try {
    const cart = await getOrSetCart(countryCode)
    if (!cart) {
      return { success: false, error: "Error retrieving or creating cart" }
    }

    const authHeaders = await getAuthHeaders()

    try {
      await sdk.store.cart.createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
        },
        {},
        authHeaders
      )
      return { success: true }
    } catch (sdkError: any) {
      const message = getMedusaErrorMessage(sdkError)
      return { success: false, error: message }
    }
  } catch (error: any) {
    const errorMessage = error.message || "Failed to add item to cart"
    return { success: false, error: errorMessage }
  }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}): Promise<CartActionResult> {
  if (!lineId) {
    return { success: false, error: "Missing lineItem ID when updating line item" }
  }

  const cartId = await getCartId()
  if (!cartId) {
    return { success: false, error: "Missing cart ID when updating line item" }
  }

  try {
    const authHeaders = await getAuthHeaders()
    await sdk.store.cart.updateLineItem(cartId, lineId, { quantity }, {}, authHeaders)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: getMedusaErrorMessage(error) }
  }
}

export async function deleteLineItem(lineId: string): Promise<CartActionResult> {
  if (!lineId) {
    return { success: false, error: "Missing lineItem ID when deleting line item" }
  }

  try {
    const cartId = await getCartId()
    if (!cartId) {
      return { success: false, error: "Missing cart ID when deleting line item" }
    }

    const authHeaders = await getAuthHeaders()
    await sdk.store.cart.deleteLineItem(cartId, lineId, {}, authHeaders)
    try {
      const { cart } = await sdk.store.cart.retrieve(
        cartId,
        { fields: "+items.*,+shipping_methods.*" },
        authHeaders
      )
      if (!cart.items || cart.items.length === 0) {
        await clearShippingMethods(cartId)
      }
    } catch (err) {
      console.warn("Failed to check/clear shipping after item removal:", err)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: getMedusaErrorMessage(error) }
  }
}

export async function enrichLineItems(
  lineItems:
    | HttpTypes.StoreCartLineItem[]
    | HttpTypes.StoreOrderLineItem[]
    | null,
  regionId: string
) {
  if (!lineItems) return []

  // Prepare query parameters
  const queryParams = {
    ids: lineItems.map((lineItem) => lineItem.product_id!),
    regionId: regionId,
  }

  // Fetch products by their IDs
  const products = await getProductsById(queryParams)
  // If there are no line items or products, return an empty array
  if (!lineItems?.length || !products) {
    return []
  }

  // Enrich line items with product and variant information
  const enrichedItems = lineItems.map((item) => {
    const product = products.find((p: any) => p.id === item.product_id)
    const variant = product?.variants?.find(
      (v: any) => v.id === item.variant_id
    )

    // If product or variant is not found, return the original item
    if (!product || !variant) {
      return item
    }

    // If product and variant are found, enrich the item
    return {
      ...item,
      variant: {
        ...variant,
        product: omit(product, "variants"),
      },
    }
  }) as HttpTypes.StoreCartLineItem[]

  return enrichedItems
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const authHeaders = await getAuthHeaders()
  return sdk.store.cart
    .addShippingMethod(
      cartId,
      { option_id: shippingMethodId },
      {},
      authHeaders
    )
    .then(() => {
      // Note: Removed revalidateTag to prevent page refresh during checkout
      // Cart state is now managed client-side with TanStack Query in checkout flow
    })
    .catch(medusaError)
}

/**
 * Remove all shipping methods from cart
 * This is useful when cart becomes empty.
 * Uses Store API DELETE directly because the JS SDK does not expose deleteShippingMethod.
 */
export async function clearShippingMethods(cartId: string) {
  try {
    const authHeaders = await getAuthHeaders()
    const { cart } = await sdk.store.cart.retrieve(
      cartId,
      { fields: "+shipping_methods.*" },
      authHeaders
    )

    if (!cart.shipping_methods?.length) return

    const backendUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

    for (const method of cart.shipping_methods) {
      if (!method.id) continue
      try {
        const res = await fetch(
          `${backendUrl}/store/carts/${cartId}/shipping-methods/${method.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-publishable-api-key": publishableKey,
              ...(authHeaders as Record<string, string>),
            },
          }
        )
        if (!res.ok) {
          console.warn(
            `Failed to delete shipping method ${method.id}:`,
            res.status,
            await res.text()
          )
        }
      } catch (err) {
        console.warn(`Failed to delete shipping method ${method.id}:`, err)
      }
    }
  } catch (error: any) {
    console.error("Failed to clear shipping methods:", error)
    // Don't throw - this is a cleanup operation
  }
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: {
    provider_id: string
    context?: Record<string, unknown>
  }
) {
  const authHeaders = await getAuthHeaders()
  
  // Get the region's currency code (this is the currency configured in the backend)
  // The cart's currency should match the region's currency
  const regionCurrency = cart.region?.currency_code?.toLowerCase()
  const cartCurrency = cart.currency_code?.toLowerCase()
  
  // If cart currency doesn't match region currency, try to sync the cart
  if (regionCurrency && cartCurrency && cartCurrency !== regionCurrency) {
    console.warn(
      `Cart currency (${cartCurrency.toUpperCase()}) doesn't match region currency (${regionCurrency.toUpperCase()}). ` +
      `Attempting to sync cart with region...`
    )
    
    try {
      // Update region_id to force cart to sync with region's currency
      const updatedCart = await sdk.store.cart
        .update(cart.id, { region_id: cart.region_id }, {}, authHeaders)
        .then(({ cart }) => cart)
        .catch((err) => {
          console.warn('Failed to sync cart with region:', err.message)
          return null
        })
      
      if (updatedCart && updatedCart.currency_code?.toLowerCase() === regionCurrency) {
        // Note: Removed revalidateTag to prevent page refresh during checkout
        return sdk.store.payment
          .initiatePaymentSession(updatedCart, data, {}, authHeaders)
          .then((resp) => {
            // Cart state is managed client-side in checkout
            return resp
          })
          .catch(medusaError)
      }
    } catch (err) {
      console.warn('Error syncing cart with region:', err)
    }
    
    // If sync failed, throw a clear error
    throw new Error(
      `Payment session cannot be created: Cart currency (${cartCurrency.toUpperCase()}) doesn't match region currency (${regionCurrency.toUpperCase()}). ` +
      `The cart should use the currency configured in the region. Please refresh the cart or contact support.`
    )
  }
  
  // Ensure we have a valid currency (use region currency as source of truth)
  const currencyToUse = regionCurrency || cartCurrency
  if (!currencyToUse) {
    throw new Error(
      'Payment session cannot be created: No currency found in cart or region. ' +
      'Please ensure the cart has a valid region with a currency configured in the backend.'
    )
  }
  
  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, authHeaders)
    .then((resp) => {
      // Note: Removed revalidateTag to prevent page refresh
      // Cart state is now managed client-side with TanStack Query
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found")
  }

  await updateCart({ promo_codes: codes })
    .then(() => {
      // Note: Removed revalidateTag to prevent page refresh
      // Cart state is managed client-side with CheckoutCartProvider in checkout
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

export async function updateContactInfo(data: {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
}): Promise<HttpTypes.StoreCart> {
  try {
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when updating contact info")
    }

    const cart = await retrieveCart()
    if (!cart) {
      throw new Error("Cart not found")
    }

    // Build update data - only include fields that were provided
    const updateData: HttpTypes.StoreUpdateCart = {} as any

    // Update email if provided
    if (data.email !== undefined) {
      updateData.email = data.email
    }

    // Build shipping address with updates
    // Create minimal address if it doesn't exist (for Econt Office or other methods that don't require full address)
    const defaultCountryCode = cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "bg"
    const shippingAddress = {
      ...(cart.shipping_address || {}),
      // Set defaults if address doesn't exist
      address_1: cart.shipping_address?.address_1 || "",
      city: cart.shipping_address?.city || "",
      country_code: cart.shipping_address?.country_code || defaultCountryCode,
      postal_code: cart.shipping_address?.postal_code || "",
      province: cart.shipping_address?.province || "",
      company: cart.shipping_address?.company || "",
    } as any

    if (data.first_name !== undefined) {
      shippingAddress.first_name = data.first_name
    }
    if (data.last_name !== undefined) {
      shippingAddress.last_name = data.last_name
    }
    if (data.phone !== undefined) {
      shippingAddress.phone = data.phone
    }

    // Always set billing_address = shipping_address (Bulgaria requirement)
    updateData.shipping_address = shippingAddress
    updateData.billing_address = shippingAddress

    const updatedCart = await updateCart(updateData)
    
    // Return the updated cart with the changes applied locally
    return {
      ...cart,
      email: updateData.email ?? cart.email,
      shipping_address: shippingAddress as HttpTypes.StoreCartAddress,
      billing_address: shippingAddress as HttpTypes.StoreCartAddress,
    } as HttpTypes.StoreCart
  } catch (e: any) {
    throw new Error(e.message || "Failed to update contact information")
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const cart = await retrieveCart()
    if (!cart) {
      throw new Error("Cart not found")
    }

    // Get default country code from cart region (Bulgaria: "bg")
    const defaultCountryCode =
      cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "bg"

    const shippingAddress = {
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
      // TODO: Uncomment when needed - Company field for business addresses
      company: "", // formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
      // TODO: Uncomment when needed - Country field for international shipping
      country_code: defaultCountryCode, // formData.get("shipping_address.country_code") || defaultCountryCode,
      // TODO: Uncomment when needed - Province field for regions/states
      province: "", // formData.get("shipping_address.province"),
    } as any

    // Preserve contact info from cart (set via Contact component)
    if (cart.shipping_address) {
      shippingAddress.first_name =
        cart.shipping_address.first_name || undefined
      shippingAddress.last_name = cart.shipping_address.last_name || undefined
      shippingAddress.phone = cart.shipping_address.phone || undefined
    }

    const data = {
      shipping_address: shippingAddress,
      // Always set billing_address = shipping_address (Bulgaria requirement)
      billing_address: shippingAddress,
      // Preserve email from cart (set via Contact component)
      email: cart.email,
    } as any

    await updateCart(data)
    const updatedCart = await retrieveCart()
    const { saveAddressFromCartWithoutDuplicate } = await import("./customer")
    await saveAddressFromCartWithoutDuplicate(updatedCart).catch(() => {})
    return null // Success
  } catch (e: any) {
    return e.message
  }
}

/** Payload for updating only shipping address (e.g. from selector or debounced manual fields). */
export type UpdateCartShippingAddressPayload = {
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
  company?: string
  first_name?: string
  last_name?: string
  phone?: string
  /** When provided (e.g. from Econt form), merged into cart so saved address includes office_name, office_address, etc. */
  econtData?: Record<string, unknown>
}

/**
 * Updates the cart's shipping (and billing) address without a form submit.
 * Merges payload with existing cart.shipping_address (preserves contact from cart).
 * Call when user selects a saved address or when manual address fields change (debounced).
 * Returns updated cart so client can sync context.
 */
export async function updateCartShippingAddress(
  payload: UpdateCartShippingAddressPayload
): Promise<{ error: string | null; cart?: HttpTypes.StoreCart | null }> {
  try {
    const cart = await retrieveCart()
    if (!cart) return { error: "Cart not found" }

    const defaultCountryCode =
      cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "bg"

    const shippingAddress = {
      ...(cart.shipping_address || {}),
      address_1: payload.address_1 ?? cart.shipping_address?.address_1 ?? "",
      address_2: payload.address_2 ?? cart.shipping_address?.address_2 ?? "",
      city: payload.city ?? cart.shipping_address?.city ?? "",
      postal_code: payload.postal_code ?? cart.shipping_address?.postal_code ?? "",
      province: payload.province ?? cart.shipping_address?.province ?? "",
      country_code: (payload.country_code ?? cart.shipping_address?.country_code ?? defaultCountryCode).toLowerCase(),
      company: payload.company ?? cart.shipping_address?.company ?? "",
      first_name: payload.first_name ?? cart.shipping_address?.first_name ?? "",
      last_name: payload.last_name ?? cart.shipping_address?.last_name ?? "",
      phone: payload.phone ?? cart.shipping_address?.phone ?? "",
    } as HttpTypes.StoreCartAddress

    const data: HttpTypes.StoreUpdateCart = {
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
    }
    await updateCart(data)
    let updatedCart = await retrieveCart()
    // When caller provides econtData (e.g. from Econt form), merge so saved address gets office_name, office_address, etc.
    if (payload.econtData && updatedCart) {
      updatedCart = {
        ...updatedCart,
        metadata: { ...(updatedCart.metadata || {}), econt: payload.econtData },
      } as typeof updatedCart
    }
    // #region agent log
    const cartMeta = updatedCart as { metadata?: { econt?: unknown } } | null
    fetch('http://127.0.0.1:7242/ingest/8b9af399-e3f7-4648-a911-e99a39dfc51e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cart.ts:updateCartShippingAddress',message:'Cart before saveAddressFromCart',data:{hasCartMetadataEcont:!!cartMeta?.metadata?.econt,shippingAddressHasEcont:!!(updatedCart?.shipping_address as { metadata?: { econt?: unknown } })?.metadata?.econt},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const { saveAddressFromCartWithoutDuplicate } = await import("./customer")
    await saveAddressFromCartWithoutDuplicate(updatedCart).catch(() => {})
    return { error: null, cart: updatedCart }
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update address" }
  }
}

export async function placeOrder() {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found when placing an order")
  }

  let cart = await retrieveCart()
  if (!cart) {
    throw new Error("Cart not found")
  }

  // Check if Econt Office is selected (doesn't require shipping address)
  const selectedShippingMethod = cart.shipping_methods?.at(-1)
  const { isEcontOfficeShippingMethod } = await import(
    "@modules/checkout/lib/is-econt-office"
  )
  const isEcontOffice = isEcontOfficeShippingMethod(selectedShippingMethod)

  // For Econt Office, create minimal shipping address from contact info if not present
  // This ensures Medusa validation passes while not requiring full address
  // Note: Contact info (first_name, last_name, phone) should already be in cart from Contact component
  if (isEcontOffice && !cart.shipping_address && cart.email) {
    const defaultCountryCode = cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "bg"
    
    // Get contact info - it should be in cart from Contact component
    // If not available, use email as fallback for first_name
    const minimalAddress = {
      first_name: "Customer", // Will be updated by contact info if available
      last_name: "",
      address_1: "Econt Office Delivery", // Placeholder for Econt Office
      city: "",
      country_code: defaultCountryCode,
      postal_code: "",
      phone: "",
    } as any

    // Note: Contact component should have already set first_name, last_name, phone
    // But we create minimal address here as fallback to ensure Medusa validation passes
    await updateCart({
      shipping_address: minimalAddress,
      billing_address: minimalAddress,
    })
    
    // Re-fetch cart to get updated address
    const updatedCart = await retrieveCart()
    if (updatedCart?.shipping_address) {
      // Use updated cart for completion
      cart = updatedCart
    }
  }

  const authHeaders = await getAuthHeaders()
  const cartRes = await sdk.store.cart
    .complete(cartId, {}, authHeaders)
    .then((cartRes) => {
      // Note: Removed revalidateTag - we're redirecting to order confirmation immediately
      // No need to revalidate cart since we're leaving the checkout page
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const order = cartRes.order
    const countryCode =
      order.shipping_address?.country_code?.toLowerCase()
    
    // Attach first-touch origin to customer (first-touch only; backend skips if already set)
    if (order.customer_id) {
      await sendCustomerOriginToBackend({ customer_id: order.customer_id }).catch(() => {})
    }
    
    // Track purchase completion (server-side)
    try {
      const { trackPurchase } = await import("@lib/analytics/server")
      await trackPurchase(order)
    } catch (error) {
      // Don't block order completion if analytics fails
      console.error("Failed to track purchase:", error)
    }
    
    await removeCartId()
    redirect(`/${countryCode}/order/confirmed/${order.id}`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    revalidateTag("cart", "max")
  }

  revalidateTag("regions", "max")
  revalidateTag("products", "max")

  redirect(`/${countryCode}${currentPath}`)
}