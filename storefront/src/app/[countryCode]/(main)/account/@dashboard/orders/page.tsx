import { Metadata } from "next"
import { notFound } from "next/navigation"

import OrderOverview from "@modules/account/components/order-overview"
import OrdersPageHeader from "@modules/account/components/orders-page-header"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

export default async function OrdersPage() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full max-w-4xl" data-testid="orders-page-wrapper">
      <OrdersPageHeader />
      <OrderOverview orders={orders} />
    </div>
  )
}
