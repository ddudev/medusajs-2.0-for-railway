"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { omit } from "lodash"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
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
    // No caching - cart is user-specific and must be fresh
    const result = await sdk.store.cart
      .retrieve(cartId, {}, { next: { tags: ["cart"] }, ...authHeaders })
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
      revalidateTag("cart", "max")
      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  try {
    const cart = await getOrSetCart(countryCode)
    if (!cart) {
      throw new Error("Error retrieving or creating cart")
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
      
      // Revalidate after successful addition - wrap in try-catch to prevent connection closure
      try {
        revalidateTag("cart", "max")
      } catch (revalidateError) {
        // Log but don't throw - cart item was added successfully
        console.warn("Failed to revalidate cart tag:", revalidateError)
      }
    } catch (sdkError: any) {
      // Handle SDK errors without closing connection
      throw medusaError(sdkError)
    }
  } catch (error: any) {
    // Ensure errors are properly propagated without closing the connection
    // Re-throw with a clean error message
    const errorMessage = error.message || "Failed to add item to cart"
    throw new Error(errorMessage)
  }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const authHeaders = await getAuthHeaders()
  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, authHeaders)
    .then(() => {
      revalidateTag("cart", "max")
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  try {
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("Missing cart ID when deleting line item")
    }

    const authHeaders = await getAuthHeaders()
    await sdk.store.cart
      .deleteLineItem(cartId, lineId, {}, authHeaders)
      .then(() => {
        revalidateTag("cart", "max")
      })
      .catch(medusaError)
    
    revalidateTag("cart", "max")
  } catch (error: any) {
    // Re-throw with a more user-friendly message
    throw new Error(error.message || "Failed to delete item from cart")
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
      revalidateTag("cart", "max")
    })
    .catch(medusaError)
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
        revalidateTag("cart", "max")
        return sdk.store.payment
          .initiatePaymentSession(updatedCart, data, {}, authHeaders)
          .then((resp) => {
            revalidateTag("cart", "max")
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
      revalidateTag("cart", "max")
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
      revalidateTag("cart", "max")
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
}) {
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

    await updateCart(updateData)
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
    return null // Success
  } catch (e: any) {
    return e.message
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
  const selectedShippingMethod = cart.shipping_methods?.[0]
  const isEcontOffice = selectedShippingMethod?.name?.toLowerCase().includes("econt") && 
                        selectedShippingMethod?.name?.toLowerCase().includes("office")

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
      revalidateTag("cart", "max")
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const order = cartRes.order
    const countryCode =
      order.shipping_address?.country_code?.toLowerCase()
    
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