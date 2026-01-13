import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INNPRO_XML_IMPORTER_MODULE } from "../../../../../modules/innpro-xml-importer"
import InnProXmlImporterService from "../../../../../modules/innpro-xml-importer/service"

/**
 * GET /admin/innpro-importer/sessions/:id
 * Get import session details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params

    const importerService: InnProXmlImporterService = req.scope.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )

    const session = await importerService.getSession(id)

    if (!session) {
      res.status(404).json({ message: "Session not found" })
      return
    }

    res.json({
      session: {
        id: session.id,
        xml_url: session.xml_url,
        status: session.status,
        total_products: session.parsed_data?.total_products || 0,
        categories: session.parsed_data?.categories || [],
        brands: session.parsed_data?.brands || [],
        brandToCategories: (session.parsed_data as any)?.brandToCategories || {},
        products: session.parsed_data?.products || [], // Include products for frontend counting
        selected_categories: session.selected_categories || [],
        selected_brands: session.selected_brands || [],
        selected_product_ids: session.selected_product_ids || [],
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
    })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
