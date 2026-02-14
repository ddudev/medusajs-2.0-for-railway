"use client"

import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import React, { useEffect, useMemo, useRef, useState } from "react"
import Input from "@modules/common/components/input"
import Divider from "@modules/common/components/divider"
import ErrorMessage from "../error-message"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useCheckoutContactSlice, useCheckoutActions } from "@lib/context/checkout-cart-context"
import { trackContactInfoCapture } from "@lib/analytics/lead-capture"
import { updateContactInfo } from "@lib/data/cart"

const Contact = ({
  cart: initialCart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { t } = useTranslation()
  const { trackCheckoutStepCompleted, trackCheckoutContactCompleted } = useAnalytics()
  const slice = useCheckoutContactSlice()
  const { updateCartData } = useCheckoutActions()
  const cart = useMemo(
    () =>
      slice
        ? ({
            id: slice.cartId,
            email: slice.email,
            shipping_address: slice.shippingAddress,
          } as HttpTypes.StoreCart)
        : initialCart,
    [
      slice?.cartId,
      slice?.email,
      slice?.shippingAddress,
      slice,
      initialCart,
    ]
  )
  
  // Initialize with empty strings to prevent uncontrolled to controlled warning
  const [formData, setFormData] = useState<Record<string, any>>({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [error, setError] = useState<string | null>(null)
  const hasTrackedContactRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<Record<string, string>>({})

  useEffect(() => {
    // Pre-fill from cart if available
    if (cart) {
      setFormData({
        email: cart.email || "",
        first_name: cart.shipping_address?.first_name || "",
        last_name: cart.shipping_address?.last_name || "",
        phone: cart.shipping_address?.phone || "",
      })
    }

    // Pre-fill from customer if logged in and cart doesn't have email yet
    // (CheckoutCustomerSync persists customer → cart on checkout init; form reflects cart/customer until then)
    if (customer && !cart?.email) {
      setFormData((prev) => ({
        email: customer.email || prev.email || "",
        first_name: customer.first_name || prev.first_name || "",
        last_name: customer.last_name || prev.last_name || "",
        phone: customer.phone || prev.phone || "",
      }))
    }
  }, [cart, customer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    setFormData({
      ...formData,
      [name]: value,
    })
    
    // Store pending changes
    pendingChangesRef.current[name] = value
    
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const savePendingChanges = async () => {
    const changes = pendingChangesRef.current
    if (Object.keys(changes).length === 0) return

    // Get current cart values to compare
    const currentValues: Record<string, string> = {
      email: cart?.email || "",
      first_name: cart?.shipping_address?.first_name || "",
      last_name: cart?.shipping_address?.last_name || "",
      phone: cart?.shipping_address?.phone || "",
    }

    // Only save fields that have actually changed and are not empty
    const dataToSave: {
      email?: string
      first_name?: string
      last_name?: string
      phone?: string
    } = {}

    let hasChanges = false

    for (const [fieldName, value] of Object.entries(changes)) {
      if (value && value !== currentValues[fieldName]) {
        dataToSave[fieldName as keyof typeof dataToSave] = value
        hasChanges = true
      }
    }

    if (!hasChanges) {
      pendingChangesRef.current = {}
      return
    }

    setError(null)

    try {
      // Save to backend and get updated cart
      const updatedCart = await updateContactInfo(dataToSave)
      
      // Update local cart state immediately (no refresh needed!)
      updateCartData(updatedCart)
      
      // Clear pending changes after successful save
      pendingChangesRef.current = {}
      
      // Check if all required fields are now filled for payment
      const finalEmail = dataToSave.email || formData.email || cart?.email
      const finalPhone = dataToSave.phone || formData.phone || cart?.shipping_address?.phone
      
      // Track contact completed when email and phone are both filled
      if (cart && !hasTrackedContactRef.current) {
        if (finalEmail && finalPhone) {
          trackCheckoutContactCompleted({
            cart_value: cart.total ? Number(cart.total) : 0,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            has_email: !!finalEmail,
            has_phone: !!finalPhone,
            country_code: cart.shipping_address?.country_code || cart.region?.countries?.[0]?.iso_2 || '',
          })
          
          trackCheckoutStepCompleted({
            cart_value: cart.total ? Number(cart.total) : 0,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            step_name: 'contact',
          })
          
          // Track lead capture to GTM and Meta Pixel
          trackContactInfoCapture({
            email: finalEmail,
            phone: finalPhone,
            firstName: dataToSave.first_name || formData.first_name || cart?.shipping_address?.first_name,
            lastName: dataToSave.last_name || formData.last_name || cart?.shipping_address?.last_name,
            source: 'checkout',
            additionalData: {
              cart_value: cart.total ? Number(cart.total) : 0,
              item_count: cart.items?.length || 0,
            },
          })
          
          hasTrackedContactRef.current = true
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save contact information")
    }
  }

  const handleBlur = async (fieldName: string, value: string) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Don't save if value is empty
    if (!value) {
      delete pendingChangesRef.current[fieldName]
      return
    }

    // Debounce the save to allow multiple fields to be filled quickly (e.g., autofill)
    // Wait 500ms after the last blur event before saving
    saveTimeoutRef.current = setTimeout(() => {
      savePendingChanges()
    }, 500)
  }

  return (
    <div className="bg-white">
        <Heading level="h2" className="checkout-heading">
        {t("checkout.contactInfo")}
      </Heading>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t("checkout.firstName")}
          name="first_name"
          autoComplete="given-name"
          value={formData.first_name || ""}
          onChange={handleChange}
          onBlur={(e) => handleBlur("first_name", e.target.value)}
          required
          data-testid="contact-first-name-input"
        />
        <Input
          label={t("checkout.lastName")}
          name="last_name"
          autoComplete="family-name"
          value={formData.last_name || ""}
          onChange={handleChange}
          onBlur={(e) => handleBlur("last_name", e.target.value)}
          required
          data-testid="contact-last-name-input"
        />
        <Input
          label={t("checkout.email")}
          name="email"
          type="email"
          title="Enter a valid email address."
          autoComplete="email"
          value={formData.email || ""}
          onChange={handleChange}
          onBlur={(e) => handleBlur("email", e.target.value)}
          required
          data-testid="contact-email-input"
        />
        <Input
          label={t("checkout.phone")}
          name="phone"
          autoComplete="tel"
          value={formData.phone || ""}
          onChange={handleChange}
          onBlur={(e) => handleBlur("phone", e.target.value)}
          data-testid="contact-phone-input"
        />
      </div>
      <ErrorMessage error={error} data-testid="contact-error-message" />
      <Divider className="mt-8" />
    </div>
  )
}

export default Contact
