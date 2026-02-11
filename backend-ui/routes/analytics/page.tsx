import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { AnalyticsDashboard } from "./components/analytics-dashboard"

export const config = defineRouteConfig({
  label: "Analytics",
  icon: ChartBar,
})

export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}
