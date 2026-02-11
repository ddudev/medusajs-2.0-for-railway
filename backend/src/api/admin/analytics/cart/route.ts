import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import AnalyticsApiService from "../analytics-service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const service = new AnalyticsApiService({ query, logger })

  try {
    const days = req.query.days ? Number(req.query.days) : 30
    const data = await service.getCartSummary({ days })
    res.json(data)
  } catch (e) {
    logger.error("[Analytics] Cart summary error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to get cart summary",
    })
  }
}
