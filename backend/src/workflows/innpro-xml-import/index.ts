/**
 * InnPro XML Import Workflow
 * 
 * Main workflow for importing products from InnPro XML format into MedusaJS.
 * This workflow handles the complete import pipeline:
 * 1. Load products from session/XML file
 * 2. Map XML format to Medusa format
 * 3. Translate content to Bulgarian
 * 4. Optimize descriptions with AI
 * 5. Process categories and brands
 * 6. Process and upload images
 * 7. Import products into Medusa
 * 8. Clean up temporary files
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { WorkflowInput, WorkflowOutput } from './types'

// Import steps
import { getSessionProductsStep } from './steps/get-session-products'
import { mapProductsStep } from './steps/map-products'
import { translateProductsStep } from './steps/translate-products'
import { optimizeDescriptionsStep } from './steps/optimize-descriptions'
import { processCategoriesAndBrandsStep } from './steps/process-categories-brands'
import { processImagesStep } from './steps/process-images'
import { getShippingProfileStep } from './steps/get-shipping-profile'
import { getDefaultSalesChannelStep } from './steps/get-default-sales-channel'
import { importProductsStep } from './steps/import-products'
import { calculateImportStatusStep } from './steps/calculate-import-status'
import { cleanupXmlFileStep } from './steps/cleanup-xml-file'

/**
 * InnPro XML Import Workflow
 * 
 * Orchestrates the complete product import process from InnPro XML format.
 */
export const innproXmlImportWorkflow = createWorkflow(
  'innpro-xml-import',
  (input: WorkflowInput) => {
    const { sessionId, shippingProfileId, filters, ollamaUrl, ollamaModel } = input

    // Step 1: Load products from session
    const sessionData = getSessionProductsStep({ sessionId })

    // Step 2: Map XML products to Medusa format
    const mappedData = mapProductsStep({ products: sessionData.products })

    // Step 3: Translate products to Bulgarian
    const translatedData = translateProductsStep({
      products: mappedData.products,
      ollamaUrl,
      ollamaModel,
    })

    // Step 4: Optimize descriptions with AI
    const optimizedData = optimizeDescriptionsStep({
      products: translatedData.products,
      ollamaUrl,
      ollamaModel,
    })

    // Step 5: Process categories and brands (with translation)
    const productsWithRelations = processCategoriesAndBrandsStep({
      products: optimizedData.products,
      ollamaUrl,
      ollamaModel,
    })

    // Step 6: Process images (upload to MinIO)
    const productsWithImages = processImagesStep({
      products: productsWithRelations.products,
    })

    // Step 7: Get or create shipping profile
    const resolvedShippingProfileId = getShippingProfileStep({ shippingProfileId })

    // Step 8: Get default sales channel
    const defaultSalesChannelId = getDefaultSalesChannelStep()

    // Step 9: Import products (without inventory tracking)
    const importResult = importProductsStep({
      products: productsWithImages.products,
      shippingProfileId: resolvedShippingProfileId,
      defaultSalesChannelId,
    })

    // Step 10: Calculate final status
    const finalResult = calculateImportStatusStep({
      sessionId,
      total: importResult.total,
      successful: importResult.successful,
      failed: importResult.failed,
    })

    // Step 11: Clean up XML file from disk
    cleanupXmlFileStep({ sessionId })

    return new WorkflowResponse(finalResult)
  }
)

export default innproXmlImportWorkflow
