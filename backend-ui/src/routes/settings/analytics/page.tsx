import { defineRouteConfig } from "@medusajs/admin-sdk"
import { AnalyticsSettingsPage } from "./components/analytics-settings-page"

export const config = defineRouteConfig({
  label: "Analytics",
})

export default AnalyticsSettingsPage
