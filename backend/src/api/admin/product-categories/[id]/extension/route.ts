import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { persistCategoryExtension } from "../../persist-category-extension"

/**
 * POST /admin/product-categories/:id/extension
 * Create or update the category extension for a product category.
 * Body: { original_name?, external_id?, description?, seo_title?, seo_meta_description? }
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const id = req.params.id as string
  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category id is required"
    )
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const payload = {
    original_name: body.original_name as string | undefined,
    external_id: body.external_id as string | null | undefined,
    description: body.description as string | null | undefined,
    seo_title: body.seo_title as string | null | undefined,
    seo_meta_description: body.seo_meta_description as string | null | undefined,
  }
  await persistCategoryExtension(req.scope, id, payload)
  res.status(200).json({ success: true })
}
