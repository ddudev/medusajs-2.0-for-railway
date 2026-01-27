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
  req: MedusaRequest<{ shippingProfileId?: string; openaiApiKey?: string; openaiModel?: string }>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params
    const { shippingProfileId, openaiApiKey, openaiModel } = (req.body as { shippingProfileId?: string; openaiApiKey?: string; openaiModel?: string }) || {}

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

    // Use provided openaiApiKey or default from env
    const resolvedOpenaiApiKey = openaiApiKey || process.env.OPENAI_API_KEY
    // Use provided openaiModel or default from env or recommended model
    const resolvedOpenaiModel = openaiModel || process.env.OPENAI_MODEL || 'gpt-5-mini'
    
    logger.info(`Starting import for session ${id} with ChatGPT Model: ${resolvedOpenaiModel}`)

    // Trigger the import workflow asynchronously
    innproXmlImportWorkflow(req.scope)
      .run({
        input: {
          sessionId: id,
          shippingProfileId,
          openaiApiKey: resolvedOpenaiApiKey,
          openaiModel: resolvedOpenaiModel,
        },
      })
      .then(async ({ result }) => {
        logger.info(`✅ Import ${id} workflow completed successfully`)
        logger.info(`Import result: ${JSON.stringify(result, null, 2)}`)

        // Update session with final status
        try {
          const finalStatus = result?.status === 'failed' ? 'failed' : 'completed'
          await importerService.updateSession(id, {
            status: finalStatus,
          })
          logger.info(`✅ Import ${id} status updated to: ${finalStatus}`)
        } catch (updateError) {
          const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown error'
          const updateErrorStack = updateError instanceof Error ? updateError.stack : String(updateError)
          logger.error(`❌ Failed to update session ${id}: ${updateErrorMessage}`)
          logger.error(`Update error stack: ${updateErrorStack}`)
        }
      })
      .catch(async (error) => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        const errorStack = error instanceof Error ? error.stack : String(error)
        logger.error(`Import ${id} workflow failed: ${errorMessage}`)
        logger.error(`Workflow error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
        logger.error(`Workflow error stack: ${errorStack}`)

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
