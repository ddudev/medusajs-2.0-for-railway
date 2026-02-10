import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CATEGORY_EXTENSION_MODULE } from "../../../modules/category-extension"

export interface CategoryExtensionPayload {
  original_name?: string
  external_id?: string | null
  description?: string | null
  seo_title?: string | null
  seo_meta_description?: string | null
}

/**
 * Create or update CategoryExtension for a product category and ensure the link exists.
 * Uses Query.graph to find existing extension (avoids Link.list() key requirement), then link.create for new links.
 */
export async function persistCategoryExtension(
  scope: { resolve: (key: string) => unknown },
  categoryId: string,
  payload: CategoryExtensionPayload
): Promise<void> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
    }) => Promise<{ data: Array<Record<string, unknown>> }>
  }
  const link = scope.resolve(ContainerRegistrationKeys.LINK) as {
    create: (data: Record<string, Record<string, string>>) => Promise<unknown>
  }
  const categoryExtensionService = scope.resolve(CATEGORY_EXTENSION_MODULE) as {
    listCategoryExtensions: (args: { id: string[] }) => Promise<Array<Record<string, unknown>>>
    createCategoryExtensions: (data: CategoryExtensionPayload[]) => Promise<Array<{ id: string }>>
    updateCategoryExtensions: (data: Array<CategoryExtensionPayload & { id: string }>) => Promise<Array<unknown>>
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "category_extension.id"],
    filters: { id: categoryId },
  })
  const first = categories?.[0]
  const ext = first?.category_extension as { id: string } | { id: string }[] | undefined
  const existingExtensionId = Array.isArray(ext) ? ext[0]?.id : ext?.id

  const data = {
    original_name: payload.original_name ?? "",
    external_id: payload.external_id ?? null,
    description: payload.description ?? null,
    seo_title: payload.seo_title ?? null,
    seo_meta_description: payload.seo_meta_description ?? null,
  }

  if (existingExtensionId) {
    await categoryExtensionService.updateCategoryExtensions([
      { id: existingExtensionId, ...data },
    ])
    return
  }

  const [created] = await categoryExtensionService.createCategoryExtensions([data])
  if (created?.id) {
    await link.create({
      [Modules.PRODUCT]: { product_category_id: categoryId },
      [CATEGORY_EXTENSION_MODULE]: { category_extension_id: created.id },
    })
  }
}
