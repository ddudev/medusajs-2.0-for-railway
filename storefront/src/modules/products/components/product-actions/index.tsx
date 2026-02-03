"use client"

import { isEqual } from "@lib/utils/is-equal"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIntersection } from "@lib/hooks/use-in-view"

import MobileActions from "./mobile-actions"
import PriceBox from "../price-box"
import TrustBadges from "../trust-badges"
import QuickBuy from "../quick-buy"
import { HttpTypes } from "@medusajs/types"
import { useStorefrontConfig } from "@lib/hooks/use-storefront-config"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useAddToCart } from "@lib/hooks/use-cart"
import { useCartDrawer } from "@lib/store/ui-store"
import { useToasts } from "@lib/store/ui-store"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
      acc[varopt.option.title] = varopt.value
    }
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const countryCode = useParams().countryCode as string
  const { openCart } = useCartDrawer()
  const { showToast } = useToasts()
  const config = useStorefrontConfig()
  const { trackProductAddedToCart, trackEvent } = useAnalytics()
  const addToCartMutation = useAddToCart()

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }))
    
    // Track variant selection
    if (selectedVariant) {
      trackEvent('product_variant_selected', {
        product_id: product.id,
        product_name: product.title,
        variant_id: selectedVariant.id,
        variant_name: selectedVariant.title,
        option_name: title,
        option_value: value,
      })
    }
  }

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // Calculate max quantity based on inventory
  const maxQuantity = useMemo(() => {
    if (!selectedVariant) return 10
    if (!selectedVariant.manage_inventory) return 10
    if (selectedVariant.allow_backorder) return 10
    return Math.min(selectedVariant.inventory_quantity || 10, 10)
  }, [selectedVariant])

  // Handle quantity changes
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1)
      return
    }
    if (newQuantity > maxQuantity) {
      setQuantity(maxQuantity)
      return
    }
    setQuantity(newQuantity)
  }

  // add the selected variant to the cart
  const handleAddToCart = () => {
    if (!selectedVariant?.id) return null

    // Track product info for analytics
    const price = selectedVariant.calculated_price?.calculated_amount
      ? Number(selectedVariant.calculated_price.calculated_amount)
      : undefined
    const currency = selectedVariant.calculated_price?.currency_code || region.currency_code || 'EUR'

    // Use TanStack Query mutation with optimistic updates
    addToCartMutation.mutate(
      {
        variantId: selectedVariant.id,
        quantity: quantity,
      },
      {
        onSuccess: () => {
          // Track analytics
          trackProductAddedToCart({
            product_id: product.id!,
            product_name: product.title,
            product_price: price,
            product_category: product.categories?.[0]?.name,
            currency: currency,
            variant_id: selectedVariant.id,
            variant_name: selectedVariant.title,
            quantity: quantity,
            cart_value: (price || 0) * quantity,
          })

          // Show success toast
          showToast({
            type: 'success',
            message: 'Added to cart',
            duration: 2000,
          })

          // Open cart drawer - no router.refresh() needed!
          openCart()
        },
        onError: (error) => {
          // Error toast shown automatically by mutation
          console.error('Failed to add to cart:', error)
          showToast({
            type: 'error',
            message: 'Failed to add to cart. Please try again.',
            duration: 4000,
          })
        },
      }
    )
  }

  // Get loading state from mutation
  const isAdding = addToCartMutation.isPending

  return (
    <>
      <div className="flex flex-col gap-6" ref={actionsRef}>
        {/* Price Box with Variant Selection */}
        <PriceBox
          product={product}
          variant={selectedVariant}
          quantity={quantity}
          onQuantityChange={handleQuantityChange}
          onAddToCart={handleAddToCart}
          isAdding={isAdding}
          inStock={inStock}
          maxQuantity={maxQuantity}
          options={options}
          setOptionValue={setOptionValue}
          disabled={!!disabled}
        />

        {/* Trust Badges */}
        <TrustBadges />

        {/* Quick Buy Button (if enabled) */}
        {config.quickBuy.showOnPDP && selectedVariant && inStock && (
          <QuickBuy
            product={product}
            variant={selectedVariant}
            className="w-full h-12 border border-border-base outline-none shadow-none text-white bg-primary hover:bg-primary hover:text-text-inverse transition-colors text-base font-semibold rounded-lg"
          />
        )}

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
