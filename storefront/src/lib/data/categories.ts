import { sdk } from "@lib/config"
import { cacheLife } from "next/cache"

// Categories metadata can be cached - doesn't include prices
export async function listCategories() {
  "use cache"
  cacheLife("hours") // Cache for 1 hour

  return sdk.store.category
    .list(
      {
        fields: "+category_children,*category_children.category_children",
        include_descendants_tree: true,
      } as Parameters<typeof sdk.store.category.list>[0],
      { next: { tags: ["categories"] } }
    )
    .then(({ product_categories }) => product_categories)
}

// Categories metadata can be cached - doesn't include prices
export async function getCategoriesList(
  offset: number = 0,
  limit: number = 100
) {
  "use cache"
  cacheLife("hours") // Cache for 1 hour

  return sdk.store.category.list(
    {
      limit,
      offset,
      fields: "+category_children,*category_children.category_children",
      include_descendants_tree: true,
    } as Parameters<typeof sdk.store.category.list>[0],
    { next: { tags: ["categories"] } }
  )
}

// Categories metadata can be cached - doesn't include prices
export async function getCategoryByHandle(
  categoryHandle: string[]
) {
  "use cache"
  cacheLife("hours") // Cache for 1 hour

  if (!categoryHandle?.length) {
    return { product_categories: [] }
  }

  // Store API expects handle as string for single lookup; array for multiple
  const handleFilter =
    categoryHandle.length === 1 ? categoryHandle[0]! : categoryHandle

  return sdk.store.category.list(
    {
      handle: handleFilter,
      fields: "+category_children,*category_children.category_children",
      include_descendants_tree: true,
    } as Parameters<typeof sdk.store.category.list>[0],
    { next: { tags: ["categories"] } }
  )
}
