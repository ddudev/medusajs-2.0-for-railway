"use client"

import { Button, Heading } from "@medusajs/ui"
import { isEqual } from "@lib/utils/is-equal"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import TextField from "@mui/material/TextField"
import IconButton from "@mui/material/IconButton"
import { Add, Remove } from "@mui/icons-material"

import { useIntersection } from "@lib/hooks/use-in-view"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import MobileActions from "./mobile-actions"
import ProductPrice from "../product-price"
import QuickBuy from "../quick-buy"
import { addToCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useStorefrontConfig } from "@lib/hooks/use-storefront-config"
import { useCartDrawer } from "@modules/cart/context/cart-context"
import { useAnalytics } from "@lib/analytics/use-analytics"

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
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string
  const router = useRouter()
  const { openCart } = useCartDrawer()
  const config = useStorefrontConfig()
  const { trackProductAddedToCart, trackEvent } = useAnalytics()

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
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: quantity,
        countryCode,
      })

      // Track product added to cart
      const price = selectedVariant.calculated_price?.calculated_amount
        ? Number(selectedVariant.calculated_price.calculated_amount) / 100
        : undefined
      const currency = selectedVariant.calculated_price?.currency_code || region.currency_code || 'EUR'

      trackProductAddedToCart({
        product_id: product.id!,
        product_name: product.title,
        product_price: price,
        product_category: product.categories?.[0]?.name,
        currency: currency,
        variant_id: selectedVariant.id,
        variant_name: selectedVariant.title,
        quantity: quantity,
        // Cart value will be updated after router.refresh(), track with product price for now
        cart_value: (price || 0) * quantity,
      })

      // Refresh the router to update cart data
      router.refresh()
      // Open the cart drawer
      openCart()
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-6" ref={actionsRef}>
        {/* Product Title */}
        <Heading
          level="h1"
          className="text-3xl md:text-4xl lg:text-5xl leading-tight text-text-primary font-bold tracking-tight"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        {/* Variant Selection */}
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-6">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id} className="flex flex-col gap-3">
                    <label className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                      {option.title}
                    </label>
                    <OptionSelect
                      option={option}
                      current={options[option.title ?? ""]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="py-4 border-t border-b border-border-base">
          <ProductPrice product={product} variant={selectedVariant} />
        </div>

        {/* Quantity Selector */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1 || !!disabled || isAdding}
              className="border border-border-base hover:bg-background-elevated"
              size="small"
              aria-label="Decrease quantity"
            >
              <Remove />
            </IconButton>
            <TextField
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              inputProps={{
                min: 1,
                max: maxQuantity,
                style: { textAlign: 'center', padding: '8px' }
              }}
              disabled={!!disabled || isAdding}
              className="w-20"
              size="small"
            />
            <IconButton
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity || !!disabled || isAdding}
              className="border border-border-base hover:bg-background-elevated"
              size="small"
              aria-label="Increase quantity"
            >
              <Add />
            </IconButton>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant || !!disabled || isAdding}
            className="w-full h-14 bg-primary text-text-inverse hover:bg-primary-hover transition-colors font-semibold text-lg rounded-lg shadow-md hover:shadow-lg"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {!selectedVariant
              ? "Select variant"
              : !inStock
              ? "Out of stock"
              : "Add to cart"}
          </Button>
          
          {/* Quick Buy Button */}
          {config.quickBuy.showOnPDP && selectedVariant && inStock && (
            <QuickBuy
              product={product}
              variant={selectedVariant}
              className="w-full h-12 border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-text-inverse transition-colors font-semibold rounded-lg"
            />
          )}
        </div>
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
