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
    const data = await service.getRegionsPopularity({ start_date, end_date })
    res.json(data)
  } catch (e) {
    logger.error("[Analytics] Regions popularity error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to get regions popularity",
    })
  }
}
