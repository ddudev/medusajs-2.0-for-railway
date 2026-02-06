import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import type { IProductModuleService } from "@medusajs/framework/types"
import { CATEGORY_EXTENSION_MODULE } from "../../../../modules/category-extension"

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

/** Attach linked CategoryExtension (original_name, external_id, etc.) to category. Uses Link.list + CategoryExtension module so we never pass link fields to ProductCategoryRepository. */
async function attachCategoryExtension(
  scope: { resolve: (key: string) => unknown },
  categoryId: string,
  category: Record<string, unknown>
): Promise<void> {
  try {
    const link = scope.resolve(ContainerRegistrationKeys.LINK) as {
      list: (args: Record<string, Record<string, string>>) => Promise<Array<Record<string, Record<string, string>>>>
    }
    const links = await link.list({
      [Modules.PRODUCT]: { product_category_id: categoryId },
      [CATEGORY_EXTENSION_MODULE]: {},
    })
    const first = links?.[0] as Record<string, { category_extension_id?: string }> | undefined
    const extensionId = first?.[CATEGORY_EXTENSION_MODULE]?.category_extension_id
    if (!extensionId) return

    const categoryExtensionService = scope.resolve(CATEGORY_EXTENSION_MODULE) as {
      listCategoryExtensions: (args: { id: string[] }) => Promise<Array<Record<string, unknown>>>
    }
    const extensions = await categoryExtensionService.listCategoryExtensions({ id: [extensionId] })
    const extension = extensions?.[0]
    if (extension) {
      category.category_extension = extension
    }
  } catch {
    // Extension is optional; category still returned without it
  }
}

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

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  await updateProductCategoriesWorkflow(req.scope).run({
    input: { selector: { id }, update: (req as any).validatedBody },
  })
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
