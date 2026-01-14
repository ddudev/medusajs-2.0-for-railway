"use client"

import { useState, useEffect } from "react"
import { User } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { retrieveCustomer } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

const AccountLink = () => {
  const { t } = useTranslation()
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCustomer = async () => {
      setIsLoading(true)
      try {
        const customerData = await retrieveCustomer()
        setCustomer(customerData)
      } catch (error) {
        console.error("Error loading customer:", error)
        setCustomer(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomer()
  }, [])

  // Show loading state (optional - can show nothing or a spinner)
  if (isLoading) {
    return (
      <LocalizedClientLink
        href="/account"
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        data-testid="nav-account-link"
      >
        <User className="w-5 h-5" />
        <span className="hidden md:inline text-sm font-medium">
          {t("common.registration") || "Registration"}
        </span>
      </LocalizedClientLink>
    )
  }

  // If customer is logged in, show account options
  if (customer) {
    return (
      <LocalizedClientLink
        href="/account"
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        data-testid="nav-account-link"
      >
        <User className="w-5 h-5" />
        <span className="hidden md:inline text-sm font-medium">
          {customer.first_name 
            ? `${customer.first_name}'s Account`
            : t("common.myAccount") || "My Account"}
        </span>
      </LocalizedClientLink>
    )
  }

  // If not logged in, show registration
  return (
    <LocalizedClientLink
      href="/account"
      className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      data-testid="nav-account-link"
    >
      <User className="w-5 h-5" />
      <span className="hidden md:inline text-sm font-medium">
        {t("common.registration") || "Registration"}
      </span>
    </LocalizedClientLink>
  )
}

export default AccountLink

