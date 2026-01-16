import { HttpTypes } from "@medusajs/types"
import ProductInfoBox from "@modules/products/components/product-info-box"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}

const ProductInfo = ({ product, region }: ProductInfoProps) => {
  return <ProductInfoBox product={product} region={region} />
}

export default ProductInfo
