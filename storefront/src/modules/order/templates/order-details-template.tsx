"use client"

import { ArrowLeft } from "lucide-react"
import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  const { t } = useTranslation()
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          {t("account.orders.orderDetails")}
        </h1>
        <LocalizedClientLink href="/account/orders">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            data-testid="back-to-overview-button"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("account.orders.backToOverview")}
          </Button>
        </LocalizedClientLink>
      </div>
      <Card data-testid="order-details-container">
        <CardContent className="flex flex-col gap-6 p-6">
          <OrderDetails order={order} showStatus />
          <Items items={order.items} />
          <ShippingDetails order={order} />
          <OrderSummary order={order} />
          <Help />
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderDetailsTemplate
