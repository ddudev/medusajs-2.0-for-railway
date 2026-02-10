import { Modules } from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATEGORY_EXTENSION_MODULE } from "../modules/category-extension"

/**
 * Subscriber to delete linked CategoryExtension and link rows when a product category is deleted.
 * Listens for product-category.deleted (emitted by deleteProductCategoriesWorkflow).
 */
export default async function categoryDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const categoryId = data?.id
  if (!categoryId) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.debug(`Category deleted event: cleaning up extension for category ${categoryId}`)

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (opts: {
        entity: string
        fields: string[]
        filters?: Record<string, string>
      }) => Promise<{ data: { id: string; category_extension?: { id: string } | { id: string }[] }[] }>
    }

    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id", "category_extension.id"],
      filters: { id: categoryId },
    })

    const category = categories?.[0] as Record<string, unknown> | undefined
    const ext = category?.category_extension as { id: string } | { id: string }[] | undefined
    const extensionId = Array.isArray(ext) ? ext[0]?.id : ext?.id

    if (!extensionId) {
      logger.debug(`No linked category_extension found for category ${categoryId}`)
      return
    }

    const categoryExtensionService = container.resolve(CATEGORY_EXTENSION_MODULE) as {
      deleteCategoryExtensions: (ids: string[]) => Promise<void>
    }
    await categoryExtensionService.deleteCategoryExtensions([extensionId])
    logger.info(`Deleted category_extension ${extensionId} for category ${categoryId}`)

    const link = container.resolve(ContainerRegistrationKeys.LINK) as {
      delete: (data: Record<string, Record<string, string>>) => Promise<unknown>
    }
    await link.delete({
      [Modules.PRODUCT]: { product_category_id: categoryId },
      [CATEGORY_EXTENSION_MODULE]: { category_extension_id: extensionId },
    })
    logger.debug(`Removed link for category ${categoryId} -> extension ${extensionId}`)
  } catch (error) {
    logger.error(
      `Error cleaning up category_extension for category ${categoryId}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product-category.deleted",
}
