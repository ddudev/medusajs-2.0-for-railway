import "server-only"
import { cookies } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"

export const getAuthHeaders = async (): Promise<{ authorization: string } | {}> => {
  // Prevent static generation - cookies are user-specific
  noStore()
  
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("_medusa_jwt")?.value

    if (token) {
      return { authorization: `Bearer ${token}` }
    }

    return {}
  } catch (error) {
    // During prerendering, cookies() rejects when prerender is complete
    // This is expected behavior in Next.js 16 - return empty headers
    return {}
  }
}

export const setAuthToken = async (token: string) => {
  try {
    const cookieStore = await cookies()
    cookieStore.set("_medusa_jwt", token, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
  } catch (error) {
    // During connection close or prerendering, cookies() may fail
    // Log but don't throw to prevent connection closure
    console.warn("Failed to set auth token cookie:", error)
  }
}

export const removeAuthToken = async () => {
  try {
    const cookieStore = await cookies()
    cookieStore.set("_medusa_jwt", "", {
      maxAge: -1,
    })
  } catch (error) {
    // During connection close or prerendering, cookies() may fail
    // Log but don't throw to prevent connection closure
    console.warn("Failed to remove auth token cookie:", error)
  }
}

export const getCartId = async () => {
  // Prevent static generation - cookies are user-specific
  noStore()
  
  try {
    const cookieStore = await cookies()
    return cookieStore.get("_medusa_cart_id")?.value
  } catch (error) {
    // During prerendering, cookies() rejects when prerender is complete
    // This is expected behavior in Next.js 16 - return undefined
    return undefined
  }
}

export const setCartId = async (cartId: string) => {
  try {
    const cookieStore = await cookies()
    cookieStore.set("_medusa_cart_id", cartId, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
  } catch (error) {
    // During connection close or prerendering, cookies() may fail
    // Log but don't throw to prevent connection closure
    console.warn("Failed to set cart ID cookie:", error)
  }
}

export const removeCartId = async () => {
  try {
    const cookieStore = await cookies()
    cookieStore.set("_medusa_cart_id", "", { maxAge: -1 })
  } catch (error) {
    // During connection close or prerendering, cookies() may fail
    // Log but don't throw to prevent connection closure
    console.warn("Failed to remove cart ID cookie:", error)
  }
}

export const getLastViewedProductIds = async (): Promise<string[]> => {
  // Prevent static generation - cookies are user-specific
  noStore()
  
  try {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get("_medusa_last_viewed_products")?.value

    if (!cookieValue) {
      return []
    }

    const productIds = JSON.parse(cookieValue)
    if (!Array.isArray(productIds)) {
      return []
    }

    // Filter out any invalid values and ensure strings
    return productIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
  } catch (error) {
    // If parsing fails, return empty array
    console.warn("Failed to parse last viewed products cookie:", error)
    return []
  }
}
