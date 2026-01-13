import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ulid } from "ulid"
import innproXmlImportWorkflow from "../../../../../../workflows/innpro-xml-import"
import { INNPRO_XML_IMPORTER_MODULE } from "../../../../../../modules/innpro-xml-importer"
import InnProXmlImporterService from "../../../../../../modules/innpro-xml-importer/service"

/**
 * POST /admin/innpro-importer/sessions/:id/import
 * Trigger import workflow for selected products
 */
export async function POST(
  req: MedusaRequest<{ shippingProfileId?: string; ollamaUrl?: string; ollamaModel?: string }>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params
    const { shippingProfileId, ollamaUrl, ollamaModel } = (req.body as { shippingProfileId?: string; ollamaUrl?: string; ollamaModel?: string }) || {}

    const importerService: InnProXmlImporterService = req.scope.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = req.scope.resolve("logger")

    const session = await importerService.getSession(id)

    if (!session || !session.parsed_data) {
      res.status(404).json({ message: "Session not found or not parsed" })
      return
    }

    // Update session status to importing
    await importerService.updateSession(id, {
      status: 'importing',
    })

    // Use provided ollamaUrl or default to localhost
    const resolvedOllamaUrl = ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    // Use provided ollamaModel or default from env or recommended model
    const resolvedOllamaModel = ollamaModel || process.env.OLLAMA_MODEL || 'gemma3:latest'
    
    logger.info(`Starting import for session ${id} with Ollama URL: ${resolvedOllamaUrl}, Model: ${resolvedOllamaModel}`)

    // Trigger the import workflow asynchronously
    innproXmlImportWorkflow(req.scope)
      .run({
        input: {
          sessionId: id,
          shippingProfileId,
          ollamaUrl: resolvedOllamaUrl,
          ollamaModel: resolvedOllamaModel,
        },
      })
      .then(async ({ result }) => {
        logger.info(`Import ${id} workflow completed. Result: ${JSON.stringify(result, null, 2)}`)

        // Update session with final status
        try {
          await importerService.updateSession(id, {
            status: result?.status === 'failed' ? 'failed' : 'completed',
          })
          logger.info(`Import ${id} status updated successfully`)
        } catch (updateError) {
          logger.error(`Failed to update session ${id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
        }
      })
      .catch(async (error) => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        logger.error(`Import ${id} workflow failed: ${errorMessage}`)

        try {
          await importerService.updateSession(id, {
            status: 'failed',
          })
        } catch (updateError) {
          logger.error(`Failed to update session ${id} to 'failed' status`)
        }
      })

    res.json({
      sessionId: id,
      status: "importing",
    })
  } catch (error) {
    const logger = req.scope.resolve("logger")
    logger.error(`Error starting import: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
