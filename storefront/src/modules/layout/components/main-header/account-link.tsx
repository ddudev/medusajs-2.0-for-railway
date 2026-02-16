"use client"

import { User } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useCustomer } from "@lib/hooks/use-customer"

const AccountLink = () => {
  const { t } = useTranslation()
  const { data: customer, isLoading } = useCustomer()

  // Show loading state (optional - can show nothing or a spinner)
  if (isLoading) {
    return (
      <LocalizedClientLink
        href="/account"
        className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity p-1"
        data-testid="nav-account-link"
      >
        <User className="w-5 h-5" viewBox="0 0 15 15" />
        <span className="text-base font-medium md:block hidden">{t("login.signIn")}</span>
      </LocalizedClientLink>
    )
  }

  // If customer is logged in, show account label
  if (customer) {
    return (
      <LocalizedClientLink
        href="/account"
        className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity p-1"
        data-testid="nav-account-link"
      >
        <User className="w-5 h-5" viewBox="0 0 15 15" />
        <span className="text-base font-medium md:block hidden">{t("common.account")}</span>
      </LocalizedClientLink>
    )
  }

  // If not logged in, show log in label
  return (
    <LocalizedClientLink
      href="/account"
      className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity p-1"
      data-testid="nav-account-link"
    >
      <User className="w-5 h-5" viewBox="0 0 15 15" />
      <span className="text-base font-medium md:block hidden">{t("login.signIn")}</span>
    </LocalizedClientLink>
  )
}

export default AccountLink

