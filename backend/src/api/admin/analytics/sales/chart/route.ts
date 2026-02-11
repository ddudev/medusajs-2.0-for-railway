import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import AnalyticsApiService from "../../analytics-service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const service = new AnalyticsApiService({ query, logger })

  try {
    const start_date = req.query.start_date as string
    const end_date = req.query.end_date as string
    const group_by = (req.query.group_by as "day" | "week" | "month") || "day"
    if (!start_date || !end_date) {
      return res.status(400).json({ message: "start_date and end_date are required" })
    }
    const data = await service.getSalesChart({ start_date, end_date, group_by })
    res.json(data)
  } catch (e) {
    logger.error("[Analytics] Sales chart error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to get sales chart",
    })
  }
}
