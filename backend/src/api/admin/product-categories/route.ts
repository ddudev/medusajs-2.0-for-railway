import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { IProductModuleService } from "@medusajs/framework/types"
import { attachCategoryExtension } from "./attach-category-extension"

const DEFAULT_CATEGORY_FIELDS = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "is_internal",
  "rank",
  "parent_category_id",
  "created_at",
  "updated_at",
  "metadata",
  "*parent_category",
  "*category_children",
]

/**
 * GET /admin/product-categories
 * List product categories and attach category_extension (original_name, etc.) to each
 * so the admin UI shows our custom fields in list and detail.
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const requestedFields = (req as any).queryConfig?.fields ?? DEFAULT_CATEGORY_FIELDS
  const fields = Array.isArray(requestedFields)
    ? [...new Set([...DEFAULT_CATEGORY_FIELDS, ...requestedFields])]
    : DEFAULT_CATEGORY_FIELDS

  const {
    data: categories,
    metadata,
  } = await refetchEntities({
    entity: "product_category",
    idOrFilter: (req as any).filterableFields ?? {},
    scope: req.scope,
    fields,
    pagination: (req as any).queryConfig?.pagination,
  })

  if (!categories?.length) {
    res.json({
      product_categories: [],
      count: 0,
      offset: metadata?.skip ?? 0,
      limit: metadata?.take ?? 15,
    })
    return
  }

  for (const category of categories as Record<string, unknown>[]) {
    const id = category.id as string
    if (id) {
      await attachCategoryExtension(req.scope, id, category)
    }
  }

  res.json({
    product_categories: categories,
    count: metadata?.count ?? categories.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 15,
  })
  return
}
