"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

import OrderCard from "../order-card"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const { t } = useTranslation()

  if (orders?.length) {
    return (
      <div className="flex flex-col gap-6 w-full">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    )
  }

  return (
    <Card
      className="w-full"
      data-testid="no-orders-container"
    >
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <h2 className="text-lg font-semibold text-foreground">
          {t("account.orders.noOrders")}
        </h2>
        <p className="text-center text-sm text-muted-foreground">
          {t("account.orders.noOrdersSubtitle")}
        </p>
        <LocalizedClientLink href="/">
          <Button data-testid="continue-shopping-button">
            {t("account.orders.continueShopping")}
          </Button>
        </LocalizedClientLink>
      </CardContent>
    </Card>
  )
}

export default OrderOverview
