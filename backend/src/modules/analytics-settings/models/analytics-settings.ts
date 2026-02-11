import { model } from "@medusajs/framework/utils"

export const AnalyticsSettings = model.define("analytics_settings", {
  id: model.id().primaryKey(),
  posthog_dashboard_embed_url: model.text().nullable(),
})
