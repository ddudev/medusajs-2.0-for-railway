import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import AnalyticsApiService from "../analytics-service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const service = new AnalyticsApiService({ query, logger })

  try {
    const start_date = req.query.start_date as string | undefined
    const end_date = req.query.end_date as string | undefined
    const limit = req.query.limit ? Number(req.query.limit) : 10
    const data = await service.getProductsSummary({ start_date, end_date, limit })
    res.json(data)
  } catch (e) {
    logger.error("[Analytics] Products summary error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to get products summary",
    })
  }
}
