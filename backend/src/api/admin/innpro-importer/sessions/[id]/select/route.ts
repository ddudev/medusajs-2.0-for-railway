import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INNPRO_XML_IMPORTER_MODULE } from "../../../../../../modules/innpro-xml-importer"
import InnProXmlImporterService from "../../../../../../modules/innpro-xml-importer/service"
import { SelectionFilters } from "../../../../../../modules/innpro-xml-importer/types"

/**
 * POST /admin/innpro-importer/sessions/:id/select
 * Update session with selection filters
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params
    const { categories, brands, productIds } = req.body as SelectionFilters

    const importerService: InnProXmlImporterService = req.scope.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = req.scope.resolve("logger")

    logger.info(`Looking up session: ${id}`)
    const session = await importerService.getSession(id)

    if (!session) {
      logger.warn(`Session ${id} not found`)
      res.status(404).json({ message: "Session not found or not parsed" })
      return
    }

    if (!session.parsed_data) {
      logger.warn(`Session ${id} found but has no parsed_data`)
      res.status(404).json({ message: "Session not found or not parsed" })
      return
    }

    logger.info(`Session ${id} found with ${session.parsed_data.products?.length || 0} products in parsed_data`)
    logger.info(`Received filters - categories: ${JSON.stringify(categories)}, brands: ${JSON.stringify(brands)}, productIds: ${JSON.stringify(productIds)}`)

    // Update session with selections
    // Ensure arrays are explicitly set (even if empty, use empty array, not undefined)
    const updateData: any = {
      status: 'selecting',
    }
    
    // Explicitly set each field - use empty array if undefined, null if explicitly null
    if (categories !== undefined) {
      updateData.selected_categories = categories || null
    }
    if (brands !== undefined) {
      updateData.selected_brands = brands || null
    }
    if (productIds !== undefined) {
      updateData.selected_product_ids = productIds || null
    }
    
    logger.info(`Updating session ${id} with prepared updateData: ${JSON.stringify(updateData)}`)
    
    const updatedSession = await importerService.updateSession(id, updateData)
    
    logger.info(`Session ${id} updated. Verifying stored values - selected_categories: ${JSON.stringify(updatedSession.selected_categories)}, selected_brands: ${JSON.stringify(updatedSession.selected_brands)}, selected_product_ids: ${JSON.stringify(updatedSession.selected_product_ids)}`)

    // STREAMING APPROACH: Read products from XML file if available
    let allProducts: any[] = []
    // Try to get xml_file_path from session or updated session
    let xmlFilePath = (session as any).xml_file_path || (updatedSession as any).xml_file_path
    
    // If not found in session object, try to get it directly from database
    if (!xmlFilePath) {
      try {
        const xmlFilePathFromDb = await importerService.getXmlFilePath(id)
        if (xmlFilePathFromDb) {
          xmlFilePath = xmlFilePathFromDb
          logger.info(`Retrieved xml_file_path from database: ${xmlFilePath}`)
        }
      } catch (dbError) {
        logger.warn(`Could not retrieve xml_file_path from database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }
    }
    
    logger.info(`Session ${id} xml_file_path: ${xmlFilePath || 'NOT FOUND'}`)
    
    if (xmlFilePath) {
      logger.info(`Loading products from XML file for filtering: ${xmlFilePath}`)
      try {
        const fs = await import('fs/promises')
        const xmlContent = await fs.readFile(xmlFilePath, 'utf-8')
        const xmlData = importerService.parseXml(xmlContent)
        allProducts = importerService.extractProducts(xmlData)
        logger.info(`Loaded ${allProducts.length} products from XML file for filtering`)
      } catch (fileError) {
        logger.error(`Failed to read XML file ${xmlFilePath}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
        // Fallback to parsed_data if file read fails
        allProducts = session.parsed_data.products || []
        logger.warn(`Falling back to parsed_data: ${allProducts.length} products`)
      }
    } else {
      // Fallback: Use products from parsed_data (old approach or if xml_file_path not set)
      allProducts = session.parsed_data.products || []
      logger.info(`No xml_file_path found, using products from session parsed_data: ${allProducts.length} products`)
    }

    // Filter products based on selection
    const filters: SelectionFilters = {
      categories,
      brands,
      productIds,
    }

    const filteredProducts = importerService.filterProducts(allProducts, filters)

    logger.info(`Filtered ${filteredProducts.length} products from ${allProducts.length} total`)

    // Calculate brand counts for selected categories (if any)
    // This shows how many products from each brand are in the selected categories
    // If brands are also selected, we still show counts for all brands in those categories
    // (the actual filtering happens separately)
    let brandCountsByCategory: Record<string, number> = {}
    if (categories && categories.length > 0 && allProducts.length > 0) {
      // Filter products by selected categories first
      const categoryFilteredProducts = allProducts.filter((product) => {
        const catId = product.category?.['@_id'] || product.category?.id
        return catId && categories.includes(String(catId))
      })

      // Count products per brand within the category-filtered products
      for (const product of categoryFilteredProducts) {
        const brandId = product.producer?.['@_id'] || product.producer?.id
        if (brandId) {
          const brandIdStr = String(brandId)
          brandCountsByCategory[brandIdStr] = (brandCountsByCategory[brandIdStr] || 0) + 1
        }
      }

      logger.info(`Calculated brand counts for ${Object.keys(brandCountsByCategory).length} brands in selected categories`)
    }

    res.json({
      sessionId: id,
      totalProducts: allProducts.length,
      filteredProducts: filteredProducts.length,
      selectedCount: filteredProducts.length,
      brandCountsByCategory, // Include brand counts for selected categories
    })
  } catch (error) {
    const logger = req.scope.resolve("logger")
    logger.error(`Error updating selection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
