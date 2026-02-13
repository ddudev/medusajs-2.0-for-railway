"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import Thumbnail from "@modules/products/components/thumbnail"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const { t } = useTranslation()
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
    )
  }, [order])
  const numberOfProducts = order.items?.length ?? 0

  const itemsLabel =
    numberOfLines === 1
      ? `1 ${t("account.orders.items")}`
      : t("account.orders.itemsCount", { count: numberOfLines })

  return (
    <Card data-testid="order-card">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold uppercase text-foreground">
            #<span data-testid="order-display-id">{order.display_id}</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span data-testid="order-created-at">
              {new Date(order.created_at).toDateString()}
            </span>
            <span data-testid="order-amount">
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
            </span>
            <span>{itemsLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 small:grid-cols-4">
          {order.items?.slice(0, 3).map((i) => (
            <div
              key={i.id}
              className="flex flex-col gap-2"
              data-testid="order-item"
            >
              <Thumbnail
                thumbnail={i.thumbnail}
                images={[]}
                size="full"
                productName={i.title}
              />
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className="font-medium"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="text-muted-foreground">x</span>
                <span data-testid="item-quantity">{i.quantity}</span>
              </div>
            </div>
          ))}
          {numberOfProducts > 3 && (
            <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
              <span>+ {numberOfLines - 3}</span>
              <span>more</span>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
            <Button
              variant="secondary"
              size="sm"
              data-testid="order-details-link"
            >
              {t("account.orders.seeDetails")}
            </Button>
          </LocalizedClientLink>
        </div>
      </CardContent>
    </Card>
  )
}

export default OrderCard
