import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OllamaService } from "../../../../../modules/innpro-xml-importer/services/ollama"

export const POST = async (
  req: MedusaRequest<{ isComplex: boolean }>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { isComplex } = req.body || {}

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve("query")

  try {
    logger.info(`[AI ENHANCE] Starting enhancement for product ${id}`)

    // Fetch product with all necessary relations
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "subtitle",
        "material",
        "metadata",
        "images.*",
        "thumbnail",
      ],
      filters: { id },
    })

    const product = products[0]

    if (!product) {
      logger.warn(`[AI ENHANCE] Product ${id} not found`)
      return res.status(404).json({
        message: "Product not found",
      })
    }

    // Validate product has at least a title
    if (!product.title) {
      logger.warn(`[AI ENHANCE] Product ${id} has no title`)
      return res.status(400).json({
        message: "Product must have a title to be enhanced",
      })
    }

    // Initialize Ollama Service
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest'
    
    logger.info(`[AI ENHANCE] Using Ollama at ${ollamaUrl} with model ${ollamaModel}`)
    
    const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })

    // Check if Ollama service is available
    try {
      const healthCheck = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      
      if (!healthCheck.ok) {
        throw new Error('Ollama service unavailable')
      }
    } catch (error) {
      logger.error(`[AI ENHANCE] Ollama service unavailable at ${ollamaUrl}`, error)
      return res.status(400).json({
        message: "AI service is temporarily unavailable. Please try again later.",
      })
    }

    // Prepare images array
    const images = (product.images || []).map((img: any) => ({
      url: img.url,
      alt: img.alt_text || img.title || undefined,
    }))

    // If no images, add thumbnail as fallback
    if (images.length === 0 && product.thumbnail) {
      images.push({
        url: product.thumbnail,
        alt: product.title,
      })
    }

    logger.info(`[AI ENHANCE] Enhancing product with ${images.length} images, isComplex: ${isComplex}`)

    // Enhance product with AI
    const enhancedContent = await ollamaService.enhanceProduct({
      title: product.title,
      description: product.description || undefined,
      material: product.material || undefined,
      subtitle: product.subtitle || undefined,
      images,
      isComplex: !!isComplex,
      existingMetadata: product.metadata || undefined,
    })

    logger.info(`[AI ENHANCE] Enhancement complete, updating product ${id}`)

    // Merge existing metadata with new SEO metadata
    const updatedMetadata = {
      ...(product.metadata || {}),
      ...enhancedContent.metadata,
    }

    // Update product with enhanced content using MedusaJS modules
    const { updateProductsWorkflow } = await import("@medusajs/medusa/core-flows")
    
    await updateProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            id,
            title: enhancedContent.title,
            description: enhancedContent.description,
            metadata: updatedMetadata,
          }
        ]
      }
    })

    // Fetch updated product
    const { data: updatedProducts } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "subtitle",
        "material",
        "metadata",
        "status",
        "handle",
        "discountable",
      ],
      filters: { id },
    })

    const updatedProduct = updatedProducts[0]

    logger.info(`[AI ENHANCE] Product ${id} enhanced successfully`)

    return res.status(200).json({
      product: updatedProduct,
    })
  } catch (error) {
    logger.error(`[AI ENHANCE] Failed to enhance product ${id}:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return res.status(500).json({
      message: `Failed to enhance product: ${errorMessage}`,
    })
  }
}
