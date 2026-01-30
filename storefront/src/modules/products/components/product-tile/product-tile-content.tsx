'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { AddShoppingCart, FavoriteBorder } from '@mui/icons-material'
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
}: {
  product: HttpTypes.StoreProduct
  pricedProduct: HttpTypes.StoreProduct
  countryCode: string
  priority?: boolean
}) {
  const { t } = useTranslation()
  const params = useParams()
  const { openCart } = useCartDrawer()
  const { showToast } = useToasts()
  const addToCartMutation = useAddToCart()
  const actualCountryCode = (params?.countryCode as string) || countryCode
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  
  // Get loading state from mutation
  const isAdding = addToCartMutation.isPending

  const { cheapestPrice } = getProductPrice({
    product: pricedProduct,
  })
  const hasPrice = !!cheapestPrice?.calculated_price_number
  // fallback ако нямаш calculated_price_number:
  const hasPriceFallback = !!cheapestPrice

  const thumbnail = product.thumbnail || product.images?.[0]?.url
  const hasVariants = product.variants && product.variants.length > 0
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1

  // Get the first available variant (or first variant if no inventory management)
  const defaultVariant = product.variants?.[0]

  // Comprehensive stock status check
  const isInStock = hasVariants && (product.variants || []).some((v: any) => {
    // If inventory is not managed, product is always available
    if (!v.manage_inventory) {
      return true
    }
    // If backorders are allowed, product is available
    if (v.allow_backorder) {
      return true
    }
    // If inventory is managed and quantity > 0, product is available
    if (v.manage_inventory && (v.inventory_quantity || 0) > 0) {
      return true
    }
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
        <CardMedia
          component="div"
          className="relative bg-gray-100 overflow-hidden flex items-center justify-center w-full"
          style={{ aspectRatio: '1/1' }} // Taller aspect ratio for product tiles
        >
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={(() => {
                // Generate keyword-rich alt text with product name as main keyword
                const parts = [product.title || 'Product']
                // Add category if available for better SEO
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
            <Box className="h-full flex items-center justify-center bg-gray-100">
              <Typography variant="body2" color="text.secondary">
                {t("product.noImage")}
              </Typography>
            </Box>
          )}
          {/* Wishlist Heart Icon - Top Right */}
          <button type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            aria-label="Add to wishlist"
            className="bg-white/80 hover:bg-white rounded-full p-1.5 relative top-2 left-2 z-10 border border-border-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <FavoriteBorder className="w-4 h-4 text-gray-600" />
          </button>
        </CardMedia>

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
            <Typography variant="body2" color="text.secondary" className="mb-4 md:mb-5">
              {t("product.priceNotAvailable")}
            </Typography>
          )}
        </div>
      </Link>

      {/* Actions - Outside Link to prevent navigation */}
      <div className="p-4 md:p-2 pt-0 mt-auto">
        <button
          disabled={!hasPrice || !isInStock || isAdding || !defaultVariant}
          onClick={handleAddToCartClick}
          className="
            w-full
            flex items-center justify-center gap-2
            bg-white hover:bg-neutral-100
            text-black
            h-11 md:h-12
            rounded-md
            border border-border-base
            text-sm md:text-[15px]
            transition-all duration-200
            disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none
          "
        >
          {isAdding
            ? <CircularProgress size={16} className="shrink-0" />
            : <AddShoppingCart className="w-3 h-3 shrink-0" />
          }
          <span>
            {isAdding ? t("product.adding") : isInStock ? t("product.addToCart") : t("product.outOfStock")}
          </span>
        </button>
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

