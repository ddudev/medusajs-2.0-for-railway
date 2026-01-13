import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info" className="flex flex-col gap-y-2">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className="text-sm text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-wider font-medium"
        >
          {product.collection.title}
        </LocalizedClientLink>
      )}
    </div>
  )
}

export default ProductInfo
