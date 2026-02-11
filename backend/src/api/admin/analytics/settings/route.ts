import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_SETTINGS_MODULE } from "../../../../modules/analytics-settings"
import AnalyticsSettingsModuleService from "../../../../modules/analytics-settings/service"

/**
 * GET /admin/analytics/settings
 * Returns analytics settings (e.g. PostHog dashboard embed URL).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const service = req.scope.resolve<AnalyticsSettingsModuleService>(ANALYTICS_SETTINGS_MODULE)
    const url = await service.getPosthogEmbedUrl()
    res.json({ posthog_dashboard_embed_url: url })
  } catch (e) {
    req.scope.resolve("logger").error("[Analytics] Settings GET error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to get analytics settings",
    })
  }
}

/**
 * POST /admin/analytics/settings
 * Body: { posthog_dashboard_embed_url?: string | null }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body ?? {}) as { posthog_dashboard_embed_url?: string | null }
    const service = req.scope.resolve<AnalyticsSettingsModuleService>(ANALYTICS_SETTINGS_MODULE)
    const url = body.posthog_dashboard_embed_url ?? null
    await service.setPosthogEmbedUrl(typeof url === "string" ? url : null)
    res.json({ posthog_dashboard_embed_url: typeof url === "string" ? url : null })
  } catch (e) {
    req.scope.resolve("logger").error("[Analytics] Settings POST error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to save analytics settings",
    })
  }
}
