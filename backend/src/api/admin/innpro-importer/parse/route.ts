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

    // PHASE 1: Parse XML to extract metadata only (no products stored)
    const xmlData = await importerService.downloadAndParseXml(xmlUrl)
    const summary = importerService.extractMetadataOnly(xmlData)

    logger.info(`Extracted metadata: ${summary.total_products} products, ${summary.categories.length} categories, ${summary.brands.length} brands`)

    // Create import session first to get session ID
    const session = await importerService.createSession({
      xml_url: xmlUrl,
      parsed_data: {
        // NO products array - will be streamed later during import
        categories: summary.categories,
        brands: summary.brands,
        total_products: summary.total_products,
        brandToCategories: summary.brandToCategories,
      },
      status: 'parsing',
    })

    logger.info(`Created session: ${session.id}`)

    // PHASE 2: Download XML and save to disk using session ID
    const xmlFilePath = await importerService.saveXmlToDisk(xmlUrl, session.id)
    logger.info(`XML saved to disk: ${xmlFilePath}`)

    // Update session with XML file path and mark as ready
    // @ts-ignore - Auto-generated method
    await importerService.updateInnProImportSessions([{
      id: session.id,
      xml_file_path: xmlFilePath,
      status: 'ready',
    }])

    // Update session object with file path for response
    session.xml_file_path = xmlFilePath
    session.status = 'ready'

    res.json({
      sessionId: session.id,
      totalProducts: summary.total_products,
      categories: summary.categories,
      brands: summary.brands,
      brandToCategories: summary.brandToCategories,
      // NO products array sent to frontend - saves memory
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
