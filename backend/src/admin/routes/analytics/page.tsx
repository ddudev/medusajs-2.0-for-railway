import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"

export const config = defineRouteConfig({
  label: "Analytics",
  icon: ChartBar,
})

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <p>Use the standalone admin UI for the full analytics dashboard (cart, orders, sales, PostHog embed).</p>
    </div>
  )
}
