import { HttpTypes } from "@medusajs/types"
import { Rating } from "@mui/material"
import { getProductReviews } from "@lib/data/products"
import { isProductInStock } from "@lib/seo/utils"

type ProductInfoBoxProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}

export default async function ProductInfoBox({
  product,
  region,
}: ProductInfoBoxProps) {
  // Fetch product reviews for rating
  let averageRating = 0
  let reviewCount = 0
  
  try {
    const reviewsData = await getProductReviews({
      productId: product.id!,
      limit: 1,
      offset: 0,
    })
    averageRating = reviewsData.average_rating || 0
    reviewCount = reviewsData.count || 0
  } catch (error) {
    // If reviews fail to load, continue without rating
    console.error("Failed to load product reviews:", error)
  }

  // Check stock status
  const inStock = isProductInStock(product)
  
  // Get product SKU/code
  const productCode = product.variants?.[0]?.sku || (product as any).metadata?.sku || "N/A"
  
  // Get brand name from metadata
  const brandName = (product as any).metadata?._brand_name || null
  
  // Get promotions/campaigns from metadata (if available)
  // Handle both string and array formats
  let promotions: string[] = []
  const promotionsData = (product as any).metadata?._promotions
  if (promotionsData) {
    if (Array.isArray(promotionsData)) {
      promotions = promotionsData
    } else if (typeof promotionsData === 'string') {
      try {
        promotions = JSON.parse(promotionsData)
      } catch {
        promotions = [promotionsData]
      }
    }
  }
  
  // Calculate delivery dates (simplified - can be enhanced with actual shipping logic)
  const today = new Date()
  const deliveryStart = new Date(today)
  deliveryStart.setDate(today.getDate() + 3) // 3 days from now
  const deliveryEnd = new Date(today)
  deliveryEnd.setDate(today.getDate() + 6) // 6 days from now
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="bg-background-elevated border border-border-base rounded-3xl shadow-lg p-4 md:p-6 flex flex-col gap-4 md:gap-6">
      {/* Product Title */}
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary leading-tight">
        {product.title}
      </h1>

      {/* Metadata Group */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base text-text-primary border-b border-border-base pb-4">
        <span>Код: {productCode}</span>
        <span className="text-border-base">|</span>
        <span>{inStock ? "В наличност" : "Не е наличен"}</span>
        {reviewCount > 0 && (
          <>
            <span className="text-border-base">|</span>
            <div className="flex items-center gap-2">
              <span>Рейтинг:</span>
              <Rating
                value={averageRating}
                readOnly
                size="small"
                precision={0.5}
                sx={{
                  "& .MuiRating-iconFilled": {
                    color: "#FFD700", // Gold color for stars
                  },
                }}
              />
              <span className="text-text-secondary text-sm">
                (от {reviewCount} {reviewCount === 1 ? "ревю" : "ревюта"})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Promotions & Brand Group */}
      {(promotions.length > 0 || brandName) && (
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Promotions Row */}
          {promotions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-sm md:text-base font-semibold text-text-primary whitespace-nowrap">
                Промоции:
              </span>
              <div className="flex flex-wrap gap-2">
                {promotions.map((promo: string, index: number) => (
                  <span
                    key={index}
                    className="bg-accent text-text-inverse text-xs md:text-sm px-3 py-1 rounded-lg font-medium"
                  >
                    {promo}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Brand Row */}
          {brandName && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-sm md:text-base font-semibold text-text-primary whitespace-nowrap">
                Марка:
              </span>
              <span className="text-sm md:text-base font-semibold text-text-primary">
                {brandName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Delivery Information */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm md:text-base text-text-primary">
          <span>Очаквайте доставка на:</span>
          <span className="font-medium">
            {formatDate(deliveryStart)} - {formatDate(deliveryEnd)}
          </span>
        </div>
        <div className="text-sm md:text-base font-medium text-text-primary">
          Безплатна доставка
        </div>
      </div>
    </div>
  )
}
