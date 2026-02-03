"use client"

import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { Input } from "@/components/ui/input"
import { Button as ShadcnButton } from "@/components/ui/button"
import { Plus, Minus, ShoppingCart } from "lucide-react"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocaleParts } from "@lib/util/money"
import OptionSelect from "../product-actions/option-select"

type PriceBoxProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  quantity: number
  onQuantityChange: (quantity: number) => void
  onAddToCart: () => Promise<void>
  isAdding: boolean
  inStock: boolean
  maxQuantity: number
  options?: Record<string, string | undefined>
  setOptionValue?: (title: string, value: string) => void
  disabled?: boolean
}

export default function PriceBox({
  product,
  variant,
  quantity,
  onQuantityChange,
  onAddToCart,
  isAdding,
  inStock,
  maxQuantity,
  options = {},
  setOptionValue,
  disabled = false,
}: PriceBoxProps) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return null
  }

  // Use price parts if available, otherwise convert
  const priceParts = selectedPrice.calculated_price_parts || convertToLocaleParts({
    amount: selectedPrice.calculated_price_number, // Prices are already in decimal format
    currency_code: selectedPrice.currency_code || "EUR",
  })

  // Handle quantity changes
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      onQuantityChange(1)
      return
    }
    if (newQuantity > maxQuantity) {
      onQuantityChange(maxQuantity)
      return
    }
    onQuantityChange(newQuantity)
  }

  const hasVariants = (product.variants?.length ?? 0) > 1
  const hasOptions = product.options && product.options.length > 0

  return (
    <div className="bg-zinc-800 border border-border-base rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 shadow-lg">
      {/* Variant Selection */}
      {hasVariants && hasOptions && product.options && setOptionValue && (
        <div className="flex flex-col gap-4">
          {product.options.map((option) => {
            return (
              <div key={option.id} className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                  {option.title}
                </label>
                <OptionSelect
                  option={option}
                  current={options[option.title ?? ""]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  data-testid="product-options"
                  disabled={disabled || isAdding}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Price Display Section */}
      <div className="flex flex-col gap-2 md:gap-3">
        <span className="text-base md:text-lg text-white/90">Цена:</span>
        <div className="flex items-baseline gap-2 md:gap-3">
          <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
            {priceParts.eur}
          </span>
          <span className="text-lg md:text-xl text-white/80">
            {priceParts.bgn}
          </span>
        </div>
      </div>

      {/* Add to Cart Section - Unified dark block for mobile/tablet, split for desktop */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#111111] lg:bg-transparent p-3 md:p-4 lg:p-0 rounded-2xl lg:rounded-none">
        {/* Quantity Selector */}
        <div className="flex items-center bg-neutral-800 text-white rounded-xl overflow-hidden border border-neutral-500 w-full md:w-auto justify-between md:justify-start">
          <ShadcnButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1 || isAdding}
            className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40 rounded-none"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </ShadcnButton>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            min={1}
            max={maxQuantity}
            disabled={isAdding}
            className="w-10 h-9 text-center p-0 border-0 bg-transparent text-white font-semibold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <ShadcnButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= maxQuantity || isAdding}
            className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40 rounded-none"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </ShadcnButton>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={onAddToCart}
          disabled={!inStock || !variant || isAdding}
          className="flex-1 h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border-none text-base"
          isLoading={isAdding}
        >
          {!isAdding && <ShoppingCart className="w-5 h-5 shrink-0" />}
          <span>Добави в количка</span>
        </Button>
      </div>
    </div>
  )
}
