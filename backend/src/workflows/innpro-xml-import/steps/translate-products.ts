/**
 * Step: Translate products to Bulgarian
 * 
 * Translates product content (title, variants, options, metadata) to Bulgarian.
 * Description translation is skipped here and handled in the SEO optimization step
 * to avoid redundant translation.
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaProductData } from '../../../modules/innpro-xml-importer/types'
import { OllamaService } from '../../../modules/innpro-xml-importer/services/ollama'
import { TranslatedProductsResponse } from '../types'
import { logError } from '../utils/error-handler'

export const translateProductsStep = createStep(
  'translate-products',
  async (
    input: { products: MedusaProductData[]; ollamaUrl?: string; ollamaModel?: string },
    { container }: { container: MedusaContainer }
  ): Promise<StepResponse<TranslatedProductsResponse>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const ollamaUrl = input.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = input.ollamaModel || process.env.OLLAMA_MODEL || 'gemma3:latest'

    logger.info(`Translating ${input.products.length} products to Bulgarian`)

    try {
      const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })
      const translatedProducts: MedusaProductData[] = []

      for (let index = 0; index < input.products.length; index++) {
        const product = input.products[index]

        try {
          // Preserve original English description
          const originalDescriptionEn = product.description || ''
          const productWithMetadata = {
            ...product,
            metadata: {
              ...product.metadata,
              original_description_en: originalDescriptionEn,
            },
          }

          // Translate title (preserves brand/model)
          const brandName = product.metadata?.producer?.name
          let translatedTitle = product.title

          if (product.title && brandName) {
            translatedTitle = await ollamaService.translateTitle(product.title, brandName, 'bg')
          } else if (product.title) {
            translatedTitle = await ollamaService.translate(product.title, 'bg')
          }

          // Collect texts to translate (variants, options, metadata)
          const textsToTranslate: string[] = []
          const fieldMap: Array<{ type: string; index?: number; subIndex?: number }> = []

          // Variants
          product.variants?.forEach((variant, vIndex) => {
            if (variant.title) {
              textsToTranslate.push(variant.title)
              fieldMap.push({ type: 'variant', index: vIndex })
            }
          })

          // Options
          product.options?.forEach((option, oIndex) => {
            if (option.title) {
              textsToTranslate.push(option.title)
              fieldMap.push({ type: 'option_title', index: oIndex })
            }
            option.values?.forEach((value, vIndex) => {
              textsToTranslate.push(value)
              fieldMap.push({ type: 'option_value', index: oIndex, subIndex: vIndex })
            })
          })

          // Metadata fields
          if (product.metadata) {
            const metadataFields = ['unit_name', 'warranty_name']
            metadataFields.forEach(field => {
              if ((product.metadata as any)?.[field]) {
                textsToTranslate.push((product.metadata as any)[field])
                fieldMap.push({ type: `metadata_${field}` })
              }
            })
          }

          // Batch translate
          const translations = textsToTranslate.length > 0
            ? await ollamaService.translateBatch(textsToTranslate, 'bg')
            : []

          // Apply translations
          const translatedProduct = { ...productWithMetadata, title: translatedTitle }

          translations.forEach((translation, i) => {
            const field = fieldMap[i]
            if (field.type === 'variant' && translatedProduct.variants) {
              translatedProduct.variants[field.index!].title = translation
            } else if (field.type === 'option_title' && translatedProduct.options) {
              translatedProduct.options[field.index!].title = translation
            } else if (field.type === 'option_value' && translatedProduct.options) {
              translatedProduct.options[field.index!].values[field.subIndex!] = translation
            } else if (field.type.startsWith('metadata_') && translatedProduct.metadata) {
              const metaField = field.type.replace('metadata_', '')
              ;(translatedProduct.metadata as any)[metaField] = translation
            }
          })

          translatedProducts.push(translatedProduct)
        } catch (error) {
          logError(logger, `translate product ${index + 1}`, error)
          translatedProducts.push({
            ...product,
            metadata: {
              ...product.metadata,
              original_description_en: product.description || '',
            },
          })
        }
      }

      logger.info(`✅ Translated ${translatedProducts.length} products`)
      return new StepResponse({ products: translatedProducts })
    } catch (error) {
      logError(logger, 'translation step', error)
      return new StepResponse({ products: input.products })
    }
  }
)
