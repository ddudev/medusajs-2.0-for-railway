"use client"

const COOKIE_NAME = "_medusa_last_viewed_products"
const MAX_PRODUCTS = 6
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

/**
 * Get all cookie values as an object
 */
function getCookies(): Record<string, string> {
  if (typeof document === "undefined") {
    return {}
  }

  const cookies: Record<string, string> = {}
  document.cookie.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=")
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

/**
 * Get a specific cookie value
 */
function getCookie(name: string): string | null {
  const cookies = getCookies()
  return cookies[name] || null
}

/**
 * Set a cookie value
 */
function setCookie(
  name: string,
  value: string,
  maxAge: number = COOKIE_MAX_AGE
): void {
  if (typeof document === "undefined") {
    return
  }

  const secure = process.env.NODE_ENV === "production"
  const sameSite = "lax"

  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; sameSite=${sameSite}${secure ? "; secure" : ""}`
}

/**
 * Get the last viewed product IDs from the cookie
 * Returns an array of product IDs (max 6, most recent first)
 */
export function getLastViewedProductIds(): string[] {
  try {
    const cookieValue = getCookie(COOKIE_NAME)
    if (!cookieValue) {
      return []
    }

    const productIds = JSON.parse(cookieValue)
    if (!Array.isArray(productIds)) {
      return []
    }

    // Filter out any invalid values and ensure strings
    return productIds.filter((id): id is string => typeof id === "string" && id.length > 0)
  } catch (error) {
    // If parsing fails, return empty array
    console.warn("Failed to parse last viewed products cookie:", error)
    return []
  }
}

/**
 * Add a product ID to the last viewed products cookie
 * - Removes duplicates (if product already exists)
 * - Adds to beginning of array (most recent first)
 * - Removes oldest products (FIFO) when exceeding MAX_PRODUCTS limit
 * - Always maintains exactly MAX_PRODUCTS or fewer items
 */
export function setLastViewedProduct(productId: string): void {
  if (!productId || typeof productId !== "string") {
    return
  }

  try {
    // Get existing product IDs
    let productIds = getLastViewedProductIds()

    // Remove the product if it already exists (to avoid duplicates)
    productIds = productIds.filter((id) => id !== productId)

    // Add the new product to the beginning (most recent first)
    productIds.unshift(productId)

    // Remove oldest products (from the end) if we exceed MAX_PRODUCTS
    // This ensures we always have at most MAX_PRODUCTS items
    // FIFO: First In First Out - oldest items are removed first
    if (productIds.length > MAX_PRODUCTS) {
      productIds = productIds.slice(0, MAX_PRODUCTS)
    }

    // Save back to cookie
    setCookie(COOKIE_NAME, JSON.stringify(productIds), COOKIE_MAX_AGE)
  } catch (error) {
    console.warn("Failed to set last viewed product:", error)
  }
}
