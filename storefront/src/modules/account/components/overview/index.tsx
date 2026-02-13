"use client"

import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

function getProfileCompletion(customer: HttpTypes.StoreCustomer | null): number {
  let count = 0
  if (!customer) return 0
  if (customer.email) count++
  if (customer.first_name && customer.last_name) count++
  if (customer.phone) count++
  const billingAddress = customer.addresses?.find((addr) => addr.is_default_billing)
  if (billingAddress) count++
  return Math.round((count / 4) * 100)
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const { t } = useTranslation()
  const profileCompletion = getProfileCompletion(customer)
  const addressesCount = customer?.addresses?.length ?? 0

  return (
    <div className="w-full max-w-2xl space-y-6" data-testid="overview-page-wrapper">
      {/* Greeting */}
      <div className="flex flex-col gap-1 small:flex-row small:items-center small:justify-between small:gap-4">
        <h1
          className="text-xl font-semibold text-foreground"
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          {t("account.overview.welcome", { name: customer?.first_name ?? "" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("account.overview.signedInAs")}{" "}
          <span
            className="font-medium text-foreground"
            data-testid="customer-email"
            data-value={customer?.email}
          >
            {customer?.email}
          </span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("account.overview.profile")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-semibold tabular-nums"
                data-testid="customer-profile-completion"
                data-value={profileCompletion}
              >
                {profileCompletion}%
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("account.overview.completed")}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("account.overview.addresses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-semibold tabular-nums"
                data-testid="addresses-count"
                data-value={addressesCount}
              >
                {addressesCount}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("account.overview.saved")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("account.overview.recentOrders")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="flex flex-col gap-3"
            data-testid="orders-wrapper"
          >
            {orders && orders.length > 0 ? (
              orders.slice(0, 5).map((order) => (
                <li
                  key={order.id}
                  data-testid="order-wrapper"
                  data-value={order.id}
                >
                  <LocalizedClientLink
                    href={`/account/orders/details/${order.id}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="flex flex-row items-center justify-between p-4">
                        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm small:grid-cols-3">
                          <div>
                            <span className="font-medium text-muted-foreground">
                              {t("account.overview.datePlaced")}
                            </span>
                            <p
                              className="text-foreground"
                              data-testid="order-created-date"
                            >
                              {new Date(order.created_at).toDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">
                              {t("account.overview.orderNumber")}
                            </span>
                            <p
                              className="text-foreground"
                              data-testid="order-id"
                              data-value={order.display_id}
                            >
                              #{order.display_id}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">
                              {t("account.overview.totalAmount")}
                            </span>
                            <p
                              className="text-foreground"
                              data-testid="order-amount"
                            >
                              {convertToLocale({
                                amount: order.total,
                                currency_code: order.currency_code,
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          data-testid="open-order-button"
                          aria-label={`${t("account.overview.seeDetails")} #${order.display_id}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </LocalizedClientLink>
                </li>
              ))
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-testid="no-orders-message"
              >
                {t("account.orders.noOrders")}
              </p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default Overview
