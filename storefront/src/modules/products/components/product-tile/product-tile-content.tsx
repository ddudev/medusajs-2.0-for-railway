'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
import { addToCartAction } from '@modules/products/actions/add-to-cart'
import { useTranslation } from '@lib/i18n/hooks/use-translation'
import { useCartDrawer } from '@modules/cart/context/cart-context'
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
  const router = useRouter()
  const { openCart } = useCartDrawer()
  const actualCountryCode = (params?.countryCode as string) || countryCode
  const [isAdding, setIsAdding] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  const { cheapestPrice } = getProductPrice({
    product: pricedProduct,
  })

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
  const handleAddToCartDirect = async () => {
    if (!defaultVariant?.id || !isInStock || isAdding) {
      return
    }

    setIsAdding(true)

    try {
      const result = await addToCartAction({
        variantId: defaultVariant.id,
        quantity: 1,
        countryCode: actualCountryCode,
      })

      if (result.success) {
        router.refresh()
        setTimeout(() => {
          openCart()
        }, 300)
      } else {
        console.error('Failed to add to cart:', result.error)
        alert(`Failed to add to cart: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
      alert(`Failed to add to cart: ${error}`)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card
      className="h-full flex flex-col bg-background-elevated rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
      sx={{
        borderRadius: '8px',
      }}
    >
      <Link href={productUrl} className="block flex-grow items-center">
        {/* Image Section with Lazy Loading and Wishlist Button */}
        <CardMedia
          component="div"
          className="relative h-52 md:h-64 lg:h-72 bg-gray-100 overflow-hidden flex items-center justify-center w-full"
          style={{ aspectRatio: '3/4' }} // Taller aspect ratio for product tiles
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
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out self-center"
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
          <IconButton
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // TODO: Implement wishlist functionality
            }}
            className="bg-white/80 hover:bg-white rounded-full p-1.5 z-10"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              },
            }}
            aria-label="Add to wishlist"
          >
            <FavoriteBorder className="w-5 h-5 text-gray-600" />
          </IconButton>
        </CardMedia>

        {/* Content Section */}
        <CardContent className="flex-grow flex flex-col p-4 md:p-5">
          {/* Title */}
          <Typography
            variant="h6"
            component="h3"
            className="text-text-primary mb-4 md:mb-5 line-clamp-2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '1rem',
              fontWeight: 400,
              '@media (min-width: 768px)': {
                fontSize: '1.125rem',
              },
            }}
          >
            {product.title}
          </Typography>

          {/* Price Section - EUR prominent, BGN secondary */}
          {cheapestPrice ? (
            <Box className="flex flex-col gap-1 mb-4 md:mb-5">
              <div className="flex items-baseline gap-2">
                <Typography
                  variant="h6"
                  className="text-text-primary font-bold text-lg md:text-xl"
                  component="span"
                >
                  {cheapestPrice.calculated_price_parts?.eur || ''}
                </Typography>
              </div>
              <div className="flex items-baseline gap-2">
                <Typography
                  variant="body2"
                  className="text-text-secondary font-semibold text-sm md:text-base"
                  component="span"
                >
                  {cheapestPrice.calculated_price_parts?.bgn || ''}
                </Typography>
              </div>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" className="mb-4 md:mb-5">
              {t("product.priceNotAvailable")}
            </Typography>
          )}
        </CardContent>
      </Link>

      {/* Actions - Outside Link to prevent navigation */}
      <CardActions className="p-4 md:p-5 pt-0 mt-auto">
        <Button
          variant="contained"
          fullWidth
          startIcon={isAdding ? <CircularProgress size={16} color="inherit" /> : <AddShoppingCart />}
          disabled={!isInStock || isAdding || !defaultVariant}
          onClick={handleAddToCartClick}
          className="bg-primary hover:bg-primary-hover text-white transition-all duration-200 h-11 md:h-12 rounded-xl shadow-sm hover:shadow-md border-none"
          sx={{
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'none',
            '@media (min-width: 768px)': {
              fontSize: '0.9375rem',
            },
            '&.MuiButton-contained': {
              backgroundColor: '#FFFFFF', // primary
              color: '#373737',
              '&:hover': {
                color: '#FFFFFF',
                backgroundColor: '#E55A2B', // primary-hover
              },
            },
            '&.Mui-disabled': {
              backgroundColor: '#F3F4F6',
              color: '#9CA3AF',
            },
          }}
        >
          <span>
            {isAdding ? t("product.adding") : isInStock ? t("product.addToCart") : t("product.outOfStock")}
          </span>
        </Button>
      </CardActions>

      {/* Quick View Modal for Variant Selection */}
      {hasMultipleVariants && (
        <QuickViewModal
          product={product}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
          countryCode={actualCountryCode}
        />
      )}
    </Card>
  )
}

