"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { cache } from "react"
import { getAuthHeaders, removeAuthToken, setAuthToken } from "./cookies"

// User-specific data - accesses cookies, should NOT be cached
// Always dynamic - must be wrapped in Suspense when used
// DO NOT add "use cache" - customer data is user-specific and must be fresh
export async function getCustomer() {
  const authHeaders = await getAuthHeaders()
  return await sdk.store.customer
    .retrieve({}, { next: { tags: ["customer"] }, ...authHeaders })
    .then(({ customer }) => customer)
    .catch(() => null)
}

/**
 * Retrieve customer using the tutorial pattern
 * Uses sdk.client.fetch('/store/customers/me') which matches the official tutorial
 * This can be called from Client Components as a Server Action (since file has "use server")
 * 
 * Reference: https://docs.medusajs.com/resources/how-to-tutorials/tutorials/product-reviews#step-11-customize-nextjs-starter-storefront
 */
export const retrieveCustomer = async (): Promise<HttpTypes.StoreCustomer | null> => {
  const authHeaders = await getAuthHeaders()

  // If no auth headers (no token), return null
  if (!authHeaders || !('authorization' in authHeaders)) {
    return null
  }

  const headers = {
    ...authHeaders,
  }

  return await sdk.client
    .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: {
        fields: "*orders",
      },
      headers,
      next: {
        tags: ["customer"],
      },
      cache: "force-cache",
    })
    .then(({ customer }) => customer)
    .catch(() => null)
}

export const updateCustomer = cache(async function (
  body: HttpTypes.StoreUpdateCustomer
) {
  const authHeaders = await getAuthHeaders()
  const updateRes = await sdk.store.customer
    .update(body, {}, authHeaders)
    .then(({ customer }) => customer)
    .catch(medusaError)

  revalidateTag("customer", "default")
  return updateRes
})

/**
 * Signup function matching the tutorial pattern
 * Creates a new customer account and automatically logs them in
 * Transfers any existing guest cart to the new customer account
 * 
 * Reference: https://github.com/medusajs/nextjs-starter-medusa/blob/main/src/lib/data/customer.ts
 */
export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    // Register the customer with auth
    const registerToken = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    // Set the auth token temporarily to create the customer
    const registerTokenValue = typeof registerToken === 'string' 
      ? registerToken 
      : (registerToken as any)?.location || registerToken
    await setAuthToken(registerTokenValue)

    const headers = {
      ...(await getAuthHeaders()),
    }

    // Create the customer profile
    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    // Login the customer to get a proper session token
    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    const loginTokenValue = typeof loginToken === 'string' 
      ? loginToken 
      : (loginToken as any)?.location || loginToken
    await setAuthToken(loginTokenValue)

    // Revalidate customer cache
    const customerCacheTag = "customer"
    revalidateTag(customerCacheTag, "default")

    // Transfer any existing guest cart to the customer
    try {
      await transferCart()
    } catch (error) {
      // Don't block signup if cart transfer fails
      console.warn("Failed to transfer cart after signup:", error)
    }

    return createdCustomer
  } catch (error: any) {
    return error.toString()
  }
}

/**
 * Transfer guest cart to authenticated customer
 * Matches the tutorial pattern
 */
export async function transferCart() {
  const { getCartId } = await import("./cookies")
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const authHeaders = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, authHeaders)

  const cartCacheTag = "cart"
  revalidateTag(cartCacheTag, "default")
}

/**
 * Login function matching the tutorial pattern
 * Authenticates the customer and transfers any existing guest cart
 * 
 * Reference: https://github.com/medusajs/nextjs-starter-medusa/blob/main/src/lib/data/customer.ts
 */
export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        const tokenValue = typeof token === 'string' 
          ? token 
          : (token as any)?.location || token
        await setAuthToken(tokenValue)
        
        const customerCacheTag = "customer"
        revalidateTag(customerCacheTag, "default")
        
        // Track user login (server-side)
        try {
          const customer = await getCustomer()
          if (customer) {
            const { identifyUser } = await import("@lib/analytics/server")
            await identifyUser(customer.id, {
              email: customer.email,
              name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || undefined,
            })
            
            const { trackEvent } = await import("@lib/analytics/server")
            await trackEvent('user_logged_in', {
              user_id: customer.id,
              login_method: 'email',
            }, customer.id)
          }
        } catch (error) {
          // Don't block login if analytics fails
          console.error("Failed to track user login:", error)
        }
      })
  } catch (error: any) {
    return error.toString()
  }

  // Transfer any existing guest cart to the customer
  try {
    await transferCart()
  } catch (error: any) {
    // Don't block login if cart transfer fails
    return error.toString()
  }
}

export async function signout(countryCode: string) {
  // Track logout before signing out
  try {
    const customer = await getCustomer()
    if (customer) {
      const { trackEvent } = await import("@lib/analytics/server")
      await trackEvent('user_logged_out', {
        user_id: customer.id,
      }, customer.id)
    }
  } catch (error) {
    // Don't block logout if analytics fails
    console.error("Failed to track user logout:", error)
  }
  
  await sdk.auth.logout()
  await removeAuthToken()
  revalidateTag("auth", "default")
  revalidateTag("customer", "default")
  redirect(`/${countryCode}/account`)
}

export const addCustomerAddress = async (
  _currentState: unknown,
  formData: FormData
): Promise<any> => {
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const authHeaders = await getAuthHeaders()
  return sdk.store.customer
    .createAddress(address, {}, authHeaders)
    .then(({ customer }) => {
      revalidateTag("customer", "default")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const authHeaders = await getAuthHeaders()
  await sdk.store.customer
    .deleteAddress(addressId, authHeaders)
    .then(() => {
      revalidateTag("customer", "default")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId = currentState.addressId as string

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const authHeaders = await getAuthHeaders()
  return sdk.store.customer
    .updateAddress(addressId, address, {}, authHeaders)
    .then(() => {
      revalidateTag("customer", "default")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

/**
 * Client-side function to fetch customer data
 * Use this in Client Components - calls our Next.js API route which uses server-side getCustomer()
 * 
 * This is the most reliable method because:
 * 1. The API route runs server-side and can access httpOnly cookies
 * 2. It uses the same getCustomer() function that works in the account page
 * 3. No need to worry about CORS or cookie handling
 */
export async function fetchCustomerClient(): Promise<HttpTypes.StoreCustomer | null> {
  try {
    // Call our Next.js API route which wraps the server-side getCustomer() function
    const response = await fetch("/api/customer/me", {
      method: "GET",
      credentials: "include", // Include cookies for session
      cache: "no-store",
    })

    if (!response.ok) {
      // 404 means not authenticated - this is normal for logged-out users
      if (response.status === 404) {
        return null
      }
      // Other errors should be logged for debugging
      console.error(`Failed to fetch customer: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data.customer || null
  } catch (error) {
    // Network errors or other issues
    console.error("Error fetching customer:", error)
    return null
  }
}

/**
 * Request password reset - sends an email with reset link
 * @param _currentState - Previous form state (for useActionState)
 * @param formData - Form data containing email
 * @returns Error message or null on success
 */
export async function requestPasswordReset(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string

  if (!email) {
    return "Email is required"
  }

  try {
    // MedusaJS 2.0 auth module endpoint for password reset
    await sdk.client.fetch('/auth/customer/emailpass/reset-password', {
      method: "POST",
      body: {
        identifier: email,
      },
    })

    // Always return success to prevent email enumeration
    return null
  } catch (error: any) {
    console.error("Password reset request error:", error)
    // Don't reveal if email exists or not for security
    return null
  }
}

/**
 * Reset password using token from email
 * @param _currentState - Previous form state (for useActionState)
 * @param formData - Form data containing token and new password
 * @returns Error message or null on success
 */
export async function resetPassword(_currentState: unknown, formData: FormData) {
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token) {
    return "Reset token is required"
  }

  if (!password || password.length < 8) {
    return "Password must be at least 8 characters"
  }

  if (password !== confirmPassword) {
    return "Passwords do not match"
  }

  try {
    // MedusaJS 2.0 auth module endpoint for password reset confirmation
    await sdk.client.fetch('/auth/customer/emailpass/update', {
      method: "POST",
      body: {
        token,
        password,
      },
    })

    // Password reset successful
    return null
  } catch (error: any) {
    console.error("Password reset error:", error)
    return error?.message || "Invalid or expired reset token. Please request a new one."
  }
}
