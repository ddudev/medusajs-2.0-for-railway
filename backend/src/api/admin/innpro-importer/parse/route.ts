import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INNPRO_XML_IMPORTER_MODULE } from "../../../../modules/innpro-xml-importer"
import InnProXmlImporterService from "../../../../modules/innpro-xml-importer/service"

/**
 * POST /admin/innpro-importer/parse
 * Download and parse XML, create import session
 */
export async function POST(
  req: MedusaRequest<{ xmlUrl?: string }>,
  res: MedusaResponse
): Promise<void> {
  const { xmlUrl } = (req.body as { xmlUrl?: string }) || {}
  const logger = req.scope.resolve("logger")

  try {
    if (!xmlUrl) {
      res.status(400).json({ message: "xmlUrl is required" })
      return
    }

    const importerService: InnProXmlImporterService = req.scope.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )

    logger.info(`Starting XML parse for URL: ${xmlUrl}`)

    // Download and parse XML
    const xmlData = await importerService.downloadAndParseXml(xmlUrl)
    const products = importerService.extractProducts(xmlData)

    logger.info(`Extracted ${products.length} products from XML`)

    // Extract categories and brands
    const summary = importerService.getCategoriesAndBrands(products)

    // Create import session
    const session = await importerService.createSession({
      xml_url: xmlUrl,
      parsed_data: {
        products,
        categories: summary.categories,
        brands: summary.brands,
        total_products: summary.total_products,
        brandToCategories: summary.brandToCategories,
      },
      status: 'ready',
    })

    // Get sample products (first 5)
    const sampleProducts = products.slice(0, 5).map((p: any) => ({
      id: p['@_id'] || p.id,
      title: p.description?.name?.[0]?.['@text'] || 'N/A',
      category: p.category?.name || 'N/A',
      producer: p.producer?.name || 'N/A',
    }))

    res.json({
      sessionId: session.id,
      totalProducts: summary.total_products,
      categories: summary.categories,
      brands: summary.brands,
      brandToCategories: summary.brandToCategories,
      products: products, // Include full product list for frontend counting
      sampleProducts,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error parsing XML: ${errorMessage}`)
    
    // Provide more helpful error messages
    let userMessage = errorMessage
    if (errorMessage.includes('Failed to download XML')) {
      userMessage = `Failed to download XML from the provided URL. Please check:
- The URL is correct and accessible
- The server allows requests from this application
- The URL returns XML content (not HTML error pages)
- Network connectivity is working`
    } else if (errorMessage.includes('Failed to parse XML')) {
      userMessage = `The downloaded file is not valid XML. Please verify the URL returns XML content.`
    } else if (errorMessage.includes('timeout')) {
      userMessage = `The XML download timed out. The file might be very large or the server is slow. Please try again.`
    } else if (errorMessage.includes('Network error')) {
      userMessage = `Network error while downloading XML. Check your internet connection and that the URL is accessible.`
    }
    
    res.status(500).json({
      message: userMessage,
      error: errorMessage, // Include original error for debugging
    })
  }
}
