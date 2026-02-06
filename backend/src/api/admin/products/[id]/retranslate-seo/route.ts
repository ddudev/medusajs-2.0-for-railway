import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ChatGPTService } from "../../../../../modules/innpro-xml-importer/services/chatgpt"
import {
  extractSpecificationsTable,
  extractIncludedSection,
} from "../../../../../modules/innpro-xml-importer/utils/html-parser"

/**
 * POST /admin/products/:id/retranslate-seo
 *
 * Re-runs translation and SEO optimization for a single product using existing data.
 * Uses metadata.original_description_en or product.description as source.
 * Useful when the initial InnPro import failed to parse AI responses for title/description.
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve("query")

  try {
    logger.info(`[RETRANSLATE-SEO] Starting for product ${id}`)

    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "metadata",
      ],
      filters: { id },
    })

    const product = products[0]
    if (!product) {
      logger.warn(`[RETRANSLATE-SEO] Product ${id} not found`)
      return res.status(404).json({ message: "Product not found" })
    }

    const originalDescriptionEn =
      (product.metadata as Record<string, unknown>)?.original_description_en as string | undefined ||
      product.description ||
      ""

    if (!originalDescriptionEn?.trim()) {
      logger.warn(`[RETRANSLATE-SEO] Product ${id} has no original description`)
      return res.status(400).json({
        message:
          "Product has no description or metadata.original_description_en. Add a description first.",
      })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    const openaiModel = process.env.OPENAI_MODEL || "gpt-5-mini"
    if (!openaiApiKey) {
      logger.error(`[RETRANSLATE-SEO] OPENAI_API_KEY not configured`)
      return res.status(500).json({
        message: "AI service is not configured. Please set OPENAI_API_KEY.",
      })
    }

    const chatgptService = new ChatGPTService({
      apiKey: openaiApiKey,
      model: openaiModel,
    })

    const metadata = (product.metadata || {}) as Record<string, unknown>
    const brandName = (metadata.producer as { name?: string } | undefined)?.name

    // 1) Translate title to Bulgarian (preserves brand/model)
    logger.info(`[RETRANSLATE-SEO] Translating title for product ${id}`)
    const originalTitle = (product.title || "").trim()
    let translatedTitle = originalTitle
    if (originalTitle) {
      try {
        const result = await chatgptService.translateTitle(
          product.title,
          brandName,
          "bg"
        )
        // Never overwrite with empty: API can return "" (e.g. finish_reason: length)
        if (result && String(result).trim()) {
          translatedTitle = String(result).trim()
        }
      } catch (err) {
        logger.warn(
          `[RETRANSLATE-SEO] Title translation failed, keeping current: ${err instanceof Error ? err.message : "Unknown"}`
        )
      }
    }

    // 2) Meta description (snippets)
    logger.info(`[RETRANSLATE-SEO] Generating meta description for product ${id}`)
    const metaContent = await chatgptService.generateMetaDescription(
      { title: translatedTitle || product.title },
      originalDescriptionEn
    )
    const metaTitle =
      metaContent?.metaTitle?.trim() ||
      (translatedTitle || product.title || "").substring(0, 60)
    const metaDescription =
      metaContent?.metaDescription?.trim() ||
      originalDescriptionEn.substring(0, 180)

    // 3) SEO-optimized description (on-page)
    logger.info(`[RETRANSLATE-SEO] Optimizing description for product ${id}`)
    const descriptionContent = await chatgptService.optimizeDescription(
      { title: translatedTitle || product.title },
      originalDescriptionEn
    )

    // Never overwrite with empty: fall back to original if API returned nothing
    const description =
      (descriptionContent?.seoEnhancedDescription?.trim() ||
        descriptionContent?.technicalSafeDescription?.trim() ||
        "").trim() || originalDescriptionEn

    // 4) Extract "What's Included" from original description
    logger.info(`[RETRANSLATE-SEO] Extracting included items for product ${id}`)
    const includedItems =
      (await chatgptService.extractIncludedItems(originalDescriptionEn)) ||
      extractIncludedSection(originalDescriptionEn) ||
      undefined

    // 5) Extract specifications table from original description
    logger.info(`[RETRANSLATE-SEO] Extracting technical data for product ${id}`)
    const specificationsTable =
      (await chatgptService.extractTechnicalData(originalDescriptionEn)) ||
      extractSpecificationsTable(originalDescriptionEn) ||
      undefined

    // Merge metadata: keep existing, add/overwrite SEO fields, do not re-add original_description_en
    const { original_description_en: _drop, ...restMeta } = metadata
    const updatedMetadata: Record<string, unknown> = {
      ...restMeta,
      seo_meta_title: metaTitle,
      seo_meta_description: metaDescription,
      ...(specificationsTable && { specifications_table: specificationsTable }),
      ...(includedItems && { included_items: includedItems }),
    }

    const { updateProductsWorkflow } = await import("@medusajs/medusa/core-flows")
    // Ensure we never persist empty title or description
    const finalTitle = (translatedTitle && translatedTitle.trim()) || originalTitle || ""
    const finalDescription = (description && description.trim()) || originalDescriptionEn

    await updateProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            id,
            title: finalTitle,
            description: finalDescription,
            metadata: updatedMetadata,
          },
        ],
      },
    })

    const { data: updated } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "metadata",
        "status",
        "handle",
      ],
      filters: { id },
    })

    logger.info(`[RETRANSLATE-SEO] Product ${id} updated successfully`)
    return res.status(200).json({ product: updated[0] })
  } catch (error) {
    logger.error(`[RETRANSLATE-SEO] Failed for product ${id}:`, error)
    const message =
      error instanceof Error ? error.message : "Unknown error"
    return res.status(500).json({
      message: `Re-translate & SEO failed: ${message}`,
    })
  }
}
