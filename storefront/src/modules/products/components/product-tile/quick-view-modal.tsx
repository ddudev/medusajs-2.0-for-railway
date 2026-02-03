'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart } from 'lucide-react'
import { HttpTypes } from '@medusajs/types'
import { isEqual } from '@lib/utils/is-equal'
import OptionSelect from '@modules/products/components/product-actions/option-select'
import ProductPrice from '@modules/products/components/product-price'
import { useAddToCart } from '@lib/hooks/use-cart'
import { useCartDrawer } from '@lib/store/ui-store'
import { useToasts } from '@lib/store/ui-store'
import { useTranslation } from '@lib/i18n/hooks/use-translation'
import Image from 'next/image'

type QuickViewModalProps = {
  product: HttpTypes.StoreProduct
  open: boolean
  onClose: () => void
  countryCode: string
}

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
      acc[varopt.option.title] = varopt.value
    }
    return acc
  }, {})
}

export default function QuickViewModal({
  product,
  open,
  onClose,
  countryCode,
}: QuickViewModalProps) {
  const { t } = useTranslation()
  const params = useParams()
  const { openCart } = useCartDrawer()
  const { showToast } = useToasts()
  const addToCartMutation = useAddToCart()
  const actualCountryCode = (params?.countryCode as string) || countryCode
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [error, setError] = useState<string | null>(null)

  const isAdding = addToCartMutation.isPending

  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants, open])

  useEffect(() => {
    if (!open) {
      setOptions({})
      setError(null)
    } else if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [open, product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }
    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }
    if (selectedVariant?.allow_backorder) {
      return true
    }
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }
    return false
  }, [selectedVariant])

  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }))
    setError(null)
  }

  const handleAddToCart = () => {
    if (!selectedVariant?.id) {
      setError(t("product.selectVariant") || "Please select a variant")
      return
    }

    setError(null)

    addToCartMutation.mutate(
      {
        variantId: selectedVariant.id,
        quantity: 1,
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            openCart()
            onClose()
          }, 300)
        },
        onError: (err) => {
          setError(err.message || t("product.addToCartError") || "Failed to add to cart")
        },
      }
    )
  }

  const thumbnail = product.thumbnail || product.images?.[0]?.url

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader className="pb-1">
          <DialogTitle>
            {t("product.selectVariant") || "Select Variant"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {thumbnail && (
            <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
              <Image
                src={thumbnail}
                alt={product.title || 'Product'}
                fill
                className="object-cover"
                sizes="(max-width: 600px) 100vw, 400px"
              />
            </div>
          )}

          <h3 className="text-lg font-semibold">{product.title}</h3>

          {(product.variants?.length ?? 0) > 1 && (
            <div className="space-y-4">
              {(product.options || []).map((option) => (
                <div key={option.id} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {option.title}
                  </p>
                  <OptionSelect
                    option={option}
                    current={options[option.title ?? ""]}
                    updateOption={setOptionValue}
                    title={option.title ?? ""}
                    disabled={isAdding}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="py-4 border-t border-b border-border">
            <ProductPrice product={product} variant={selectedVariant} />
          </div>

          {selectedVariant && (
            <p
              className={
                inStock
                  ? "text-sm font-medium text-green-600"
                  : "text-sm font-medium text-destructive"
              }
            >
              {inStock
                ? t("product.inStock") || "In Stock"
                : t("product.outOfStock") || "Out of Stock"}
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="px-0 pb-0 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant || isAdding}
            className="min-w-[140px]"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <ShoppingCart className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-2">
              {isAdding
                ? t("product.adding") || "Adding..."
                : !selectedVariant
                ? t("product.selectVariant") || "Select Variant"
                : !inStock
                ? t("product.outOfStock") || "Out of Stock"
                : t("product.addToCart") || "Add to Cart"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
