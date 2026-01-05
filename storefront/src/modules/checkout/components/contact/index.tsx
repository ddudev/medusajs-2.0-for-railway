"use client"

import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import React, { useEffect, useState } from "react"
import Input from "@modules/common/components/input"
import { updateContactInfo } from "@lib/data/cart"
import Divider from "@modules/common/components/divider"
import ErrorMessage from "../error-message"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useRef } from "react"

const Contact = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { t } = useTranslation()
  const { trackCheckoutStepCompleted, trackCheckoutContactCompleted } = useAnalytics()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const hasTrackedContactRef = useRef(false)

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

    // Pre-fill from customer if logged in and cart doesn't have email
    if (customer && !cart?.email) {
      setFormData((prev) => ({
        ...prev,
        email: customer.email || prev.email,
        first_name: customer.first_name || prev.first_name,
        last_name: customer.last_name || prev.last_name,
        phone: customer.phone || prev.phone,
      }))
    }
  }, [cart, customer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleBlur = async (fieldName: string, value: string) => {
    // Don't save if value is empty or hasn't changed
    if (!value || value === (cart?.email || cart?.shipping_address?.[fieldName as keyof typeof cart.shipping_address] || "")) {
      return
    }

    setIsSaving((prev) => ({ ...prev, [fieldName]: true }))
    setError(null)

    try {
      const data: {
        email?: string
        first_name?: string
        last_name?: string
        phone?: string
      } = {}

      if (fieldName === "email") {
        data.email = value
      } else {
        data[fieldName as keyof typeof data] = value
      }

      await updateContactInfo(data)
      
      // Track contact completed when email and phone are both filled
      if (cart && !hasTrackedContactRef.current) {
        const hasEmail = fieldName === "email" ? !!value : !!formData.email || !!cart.email
        const hasPhone = fieldName === "phone" ? !!value : !!formData.phone || !!cart.shipping_address?.phone
        
        if (hasEmail && hasPhone) {
          trackCheckoutContactCompleted({
            cart_value: cart.total ? Number(cart.total) / 100 : 0,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            has_email: hasEmail,
            has_phone: hasPhone,
            country_code: cart.shipping_address?.country_code || cart.region?.countries?.[0]?.iso_2 || '',
          })
          
          trackCheckoutStepCompleted({
            cart_value: cart.total ? Number(cart.total) / 100 : 0,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            step_name: 'contact',
          })
          
          hasTrackedContactRef.current = true
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save contact information")
    } finally {
      setIsSaving((prev) => ({ ...prev, [fieldName]: false }))
    }
  }

  return (
    <div className="bg-white">
      <Heading
        level="h2"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline mb-6"
      >
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
      {(Object.values(isSaving).some((saving) => saving) || error) && (
        <div className="mt-4">
          {Object.values(isSaving).some((saving) => saving) && (
            <p className="text-small-regular text-ui-fg-subtle">{t("checkout.saving")}</p>
          )}
          <ErrorMessage error={error} data-testid="contact-error-message" />
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Contact
