import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATEGORY_EXTENSION_MODULE } from "../../../modules/category-extension"

/**
 * Attach linked CategoryExtension (original_name, external_id, etc.) to a category object.
 * Uses Query.graph to avoid Link.list() key requirement; extension is optional.
 */
export async function attachCategoryExtension(
  scope: { resolve: (key: string) => unknown },
  categoryId: string,
  category: Record<string, unknown>
): Promise<void> {
  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (opts: {
        entity: string
        fields: string[]
        filters?: Record<string, unknown>
      }) => Promise<{ data: Array<Record<string, unknown>> }>
    }
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id", "category_extension.*"],
      filters: { id: categoryId },
    })
    const first = categories?.[0]
    const ext = first?.category_extension as Record<string, unknown> | Record<string, unknown>[] | undefined
    const extension = Array.isArray(ext) ? ext[0] : ext
    if (extension && typeof extension === "object" && "id" in extension) {
      const categoryExtensionService = scope.resolve(CATEGORY_EXTENSION_MODULE) as {
        listCategoryExtensions: (args: { id: string[] }) => Promise<Array<Record<string, unknown>>>
      }
      const extensions = await categoryExtensionService.listCategoryExtensions({
        id: [extension.id as string],
      })
      const full = extensions?.[0]
      if (full) {
        category.category_extension = full
      }
    }
  } catch {
    // Extension is optional; category still returned without it
  }
}
