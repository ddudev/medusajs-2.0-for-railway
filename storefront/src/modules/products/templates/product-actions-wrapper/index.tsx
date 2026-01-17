import { getProductsById } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  initialProduct,
}: {
  id: string
  region: HttpTypes.StoreRegion
  initialProduct?: HttpTypes.StoreProduct
}) {
  let product = initialProduct

  try {
    const [fetchedProduct] = await getProductsById({
      ids: [id],
      regionId: region.id,
    })

    if (fetchedProduct) {
      product = fetchedProduct
    }
  } catch (error) {
    console.error(`Failed to fetch fresh product data for ${id}, falling back to initial data. Error:`, error)
    // Keep using initialProduct if available from closure
  }

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} />
}
