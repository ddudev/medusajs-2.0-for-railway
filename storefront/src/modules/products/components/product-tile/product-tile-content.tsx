'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShoppingCart, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HttpTypes } from '@medusajs/types'
import { getProductPrice } from '@lib/util/get-product-price'
import { useTranslation } from '@lib/i18n/hooks/use-translation'
import { useAddToCart } from '@lib/hooks/use-cart'
import { useCartDrawer } from '@lib/store/ui-store'
import { useToasts } from '@lib/store/ui-store'
import QuickViewModal from './quick-view-modal'
import { PriceDisplayParts } from '@modules/common/components/price-display'

/**
 * Client Component for Product Tile with interactive features
 * - Entire card is clickable (links to product page)
 * - Add to Cart button that adds product to cart
 */
export default function ProductTileContent({
  product,
  pricedProduct,
  countryCode,
  priority = false,
  assumeAvailableWhenZeroInventory = false,
}: {
  product: HttpTypes.StoreProduct
  pricedProduct: HttpTypes.StoreProduct
  countryCode: string
  priority?: boolean
  /** When true (e.g. carousel), always show "Add to cart" in this tile; PDP/cart enforce real stock. */
  assumeAvailableWhenZeroInventory?: boolean
}) {
  const { t } = useTranslation()
  const params = useParams()
  const { openCart } = useCartDrawer()
  const { showToast } = useToasts()
  const addToCartMutation = useAddToCart()
  const actualCountryCode = (params?.countryCode as string) || countryCode
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  
  // Per-tile mutation: isPending is true only while this tile's add is in progress
  const isAdding = addToCartMutation.isPending

  const { cheapestPrice } = getProductPrice({
    product: pricedProduct,
  })
  const hasPrice = !!cheapestPrice?.calculated_price_number
  // fallback ако нямаш calculated_price_number:
  const hasPriceFallback = !!cheapestPrice

  const thumbnail = product.thumbnail || product.images?.[0]?.url
  // Use pricedProduct for variants when available (has inventory_quantity from API)
  const variantsForStock = pricedProduct.variants?.length
    ? pricedProduct.variants
    : product.variants
  const hasVariants = !!variantsForStock?.length
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1

  // Prefer product.variants for default; carousel list may omit variants so fallback to pricedProduct
  const defaultVariant = product.variants?.[0] ?? pricedProduct.variants?.[0]

  // Stock: in stock when no variant data, or when any variant is purchasable. Missing inventory_quantity = assume available.
  // When assumeAvailableWhenZeroInventory (carousel): don't show "Not available" in this tile – always show "Add to cart".
  const isInStock = assumeAvailableWhenZeroInventory
    ? true
    : !hasVariants
      ? true
      : (variantsForStock || []).some((v: any) => {
          if (!v) return true
          if (!v.manage_inventory) return true
          if (v.allow_backorder) return true
          if (typeof v.inventory_quantity !== "number") return true
          if (v.inventory_quantity > 0) return true
          return false
        })

  const productUrl = `/${actualCountryCode}/products/${product.handle}`

  // Handle add to cart button click
  const handleAddToCartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // If product has multiple variants, open quick view modal
    if (hasMultipleVariants) {
      setQuickViewOpen(true)
      return
    }

    // Otherwise, add directly to cart
    handleAddToCartDirect()
  }

  // Handle direct add to cart (for single variant products)
  const handleAddToCartDirect = () => {
    if (!defaultVariant?.id || !isInStock || isAdding) {
      return
    }

    // Use TanStack Query mutation with optimistic updates
    addToCartMutation.mutate(
      {
        variantId: defaultVariant.id,
        quantity: 1,
      },
      {
        onSuccess: () => {
          // Open cart drawer - no router.refresh() needed!
          setTimeout(() => {
            openCart()
          }, 300)
        },
        onError: (error) => {
          console.error('Failed to add to cart:', error)
          showToast({
            type: 'error',
            message: `Failed to add to cart: ${error.message}`,
            duration: 4000,
          })
        },
      }
    )
  }

  return (
    <div
      className="h-full flex flex-col bg-background-elevated border bodred-border-base overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
    >
      <Link href={productUrl} className="block flex-grow items-center">
        {/* Image Section with Lazy Loading and Wishlist Button */}
        <div className="relative bg-gray-100 overflow-hidden flex items-center justify-center w-full aspect-square">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={(() => {
                const parts = [product.title || 'Product']
                if (product.categories && product.categories.length > 0) {
                  parts.push(product.categories[0].name)
                }
                return parts.join(' - ')
              })()}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out self-center aspect-square"
              sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 280px"
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
              quality={75}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100 text-sm text-muted-foreground">
              {t("product.noImage")}
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            aria-label="Add to wishlist"
            className="absolute top-2 left-2 z-10 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-border"
          >
            <Heart className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Content Section */}
        <div className="flex-grow flex flex-col px-4 pt-4 pb-2">
          {/* Title */}
          <h3 className="text-text-primary text-base font-medium mb-2 md:mb-3 line-clamp-2 leading-tight">
            {product.title}
          </h3>

          {/* Price Section - EUR prominent, BGN secondary */}
          {cheapestPrice ? (
            <div className="flex justify-between items-baseline">
              <span className="text-text-primary font-bold text-lg md:text-xl">
                {cheapestPrice.calculated_price_parts?.eur || ''}
              </span>
              <span className="text-text-secondary font-semibold text-sm md:text-base">
                {cheapestPrice.calculated_price_parts?.bgn || ''}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground mb-4 md:mb-5">
              {t("product.priceNotAvailable")}
            </span>
          )}
        </div>
      </Link>

      {/* Actions - Outside Link to prevent navigation */}
      <div className="p-4 md:p-2 pt-0 mt-auto">
        <Button
          variant="outline"
          disabled={!hasPrice || !isInStock || isAdding || !defaultVariant}
          onClick={handleAddToCartClick}
          className="w-full h-11 md:h-12 text-sm md:text-[15px]"
        >
          {isAdding ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
          ) : (
            <ShoppingCart className="h-4 w-4 shrink-0" />
          )}
          <span>
            {isAdding ? t("product.adding") : isInStock ? t("product.addToCart") : t("product.outOfStock")}
          </span>
        </Button>
      </div>

      {/* Quick View Modal for Variant Selection */}
      {hasMultipleVariants && (
        <QuickViewModal
          product={product}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
          countryCode={actualCountryCode}
        />
      )}
    </div>
  )
}

