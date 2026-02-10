import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import type { IProductModuleService } from "@medusajs/framework/types"
import { attachCategoryExtension } from "../attach-category-extension"
import { persistCategoryExtension } from "../persist-category-extension"

/**
 * Recursively collect all descendant category IDs (depth-first, children before parent)
 * so that deleteProductCategoriesWorkflow can delete children first, then the root.
 */
async function collectDescendantIds(
  productService: IProductModuleService,
  parentCategoryId: string
): Promise<string[]> {
  const children = await productService.listProductCategories({
    parent_category_id: parentCategoryId,
  })
  const ids: string[] = []
  for (const child of children) {
    ids.push(...(await collectDescendantIds(productService, child.id)))
    ids.push(child.id)
  }
  return ids
}

/**
 * Collect the category and all its descendants in delete order (descendants first, then the category).
 */
async function collectIdsToDelete(
  productService: IProductModuleService,
  categoryId: string
): Promise<string[]> {
  const descendantIds = await collectDescendantIds(productService, categoryId)
  return [...descendantIds, categoryId]
}

// Only fields on the ProductCategory entity (no link fields – Product module has no categoryExtension relation)
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

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const requestedFields = (req as any).queryConfig?.fields ?? DEFAULT_CATEGORY_FIELDS
  const fields = Array.isArray(requestedFields)
    ? [...new Set([...DEFAULT_CATEGORY_FIELDS, ...requestedFields])]
    : DEFAULT_CATEGORY_FIELDS

  const {
    data: [category],
  } = await refetchEntities({
    entity: "product_category",
    idOrFilter: { id: req.params.id, ...(req as any).filterableFields },
    scope: req.scope,
    fields,
    pagination: (req as any).queryConfig?.pagination,
  })
  if (!category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id: ${req.params.id} was not found`
    )
  }
  await attachCategoryExtension(req.scope, req.params.id, category as Record<string, unknown>)
  res.json({ product_category: category })
}

// ProductCategory fields only – workflow does not accept category_extension
const CATEGORY_UPDATE_KEYS = [
  "name",
  "description",
  "handle",
  "is_active",
  "is_internal",
  "rank",
  "parent_category_id",
  "metadata",
] as const

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const body = (req as any).validatedBody ?? req.body ?? {}
  // category_extension is stripped by middleware before framework validation; read from custom
  const categoryExtension =
    (req as any).customCategoryExtension ??
    (body.category_extension as Record<string, unknown> | undefined)
  const updatePayload: Record<string, unknown> = {}
  for (const key of CATEGORY_UPDATE_KEYS) {
    if (key in body) updatePayload[key] = body[key]
  }
  await updateProductCategoriesWorkflow(req.scope).run({
    input: { selector: { id }, update: updatePayload },
  })
  if (categoryExtension != null && typeof categoryExtension === "object") {
    await persistCategoryExtension(req.scope, id, {
      original_name: categoryExtension.original_name as string | undefined,
      external_id: categoryExtension.external_id as string | null | undefined,
      description: categoryExtension.description as string | null | undefined,
      seo_title: categoryExtension.seo_title as string | null | undefined,
      seo_meta_description: categoryExtension.seo_meta_description as string | null | undefined,
    })
  }
  const requestedFields = (req as any).queryConfig?.fields ?? DEFAULT_CATEGORY_FIELDS
  const fields = Array.isArray(requestedFields)
    ? [...new Set([...DEFAULT_CATEGORY_FIELDS, ...requestedFields])]
    : DEFAULT_CATEGORY_FIELDS
  const {
    data: [category],
  } = await refetchEntities({
    entity: "product_category",
    idOrFilter: { id, ...(req as any).filterableFields },
    scope: req.scope,
    fields,
    pagination: (req as any).queryConfig?.pagination,
  })
  if (category) {
    await attachCategoryExtension(req.scope, id, category as Record<string, unknown>)
  }
  res.status(200).json({ product_category: category })
}

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const id = req.params.id as string

  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)

  const idsToDelete = await collectIdsToDelete(productService, id)

  // Delete one by one (descendants first, then root). The workflow validates
  // "no category children" per category, so we must remove children before parent.
  for (const idToDelete of idsToDelete) {
    await deleteProductCategoriesWorkflow(req.scope).run({
      input: [idToDelete],
    })
  }

  res.status(200).json({
    id,
    object: "product_category",
    deleted: true,
  })
}
