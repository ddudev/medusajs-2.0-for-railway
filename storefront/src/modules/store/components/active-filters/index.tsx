'use client'

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { Brand } from "@lib/data/brands"

type ActiveFiltersProps = {
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  selectedCollectionIds?: string[]
  selectedCategoryIds?: string[]
  selectedBrandIds?: string[]
  selectedPriceRange?: string
}

const ActiveFilters = ({
  collections,
  categories,
  brands = [],
  selectedCollectionIds = [],
  selectedCategoryIds = [],
  selectedBrandIds = [],
  selectedPriceRange,
}: ActiveFiltersProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Format price range label from URL parameter
  const formatPriceRange = useCallback((priceRange: string): string => {
    // Legacy format support
    const legacyRanges: Record<string, string> = {
      "0-25": t("filters.under25"),
      "25-50": t("filters.price25to50"),
      "50-100": t("filters.price50to100"),
      "100-200": t("filters.price100to200"),
      "200+": t("filters.price200Plus"),
    }
    
    if (legacyRanges[priceRange]) {
      return legacyRanges[priceRange]
    }

    // New format: "min-max" or "min-+"
    const parts = priceRange.split("-")
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10)
      const max = parts[1]
      
      if (!isNaN(min)) {
        if (max === "+") {
          return `€${min}+`
        } else {
          const maxNum = parseInt(max, 10)
          if (!isNaN(maxNum)) {
            return `€${min} - €${maxNum}`
          }
        }
      }
    }
    
    return t("filters.price") || "Price"
  }, [t])

  const createQueryString = useCallback(
    (name: string, values: string[]) => {
      const params = new URLSearchParams(searchParams)
      // Remove all existing values for this parameter
      params.delete(name)
      // Add new values
      if (values.length > 0) {
        values.forEach((v) => {
          if (v) {
            params.append(name, v)
          }
        })
      }
      // Reset to page 1 when filters change
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const removeCollection = (collectionId: string) => {
    const newCollectionIds = selectedCollectionIds.filter((id) => id !== collectionId)
    const query = createQueryString("collection", newCollectionIds)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  const removeCategory = (categoryId: string) => {
    const newCategoryIds = selectedCategoryIds.filter((id) => id !== categoryId)
    const query = createQueryString("category", newCategoryIds)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  const removeBrand = (brandId: string) => {
    const newBrandIds = selectedBrandIds.filter((id) => id !== brandId)
    const query = createQueryString("brand", newBrandIds)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  const removePrice = () => {
    const params = new URLSearchParams(searchParams)
    params.delete("price")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const activeFilters = []

  // Add collection filters
  selectedCollectionIds.forEach((collectionId) => {
    const collection = collections.find((c) => c.id === collectionId)
    if (collection) {
      activeFilters.push({
        type: "collection" as const,
        id: collectionId,
        label: collection.title || collection.handle || "Collection",
        onRemove: () => removeCollection(collectionId),
      })
    }
  })

  // Add category filters
  selectedCategoryIds.forEach((categoryId) => {
    const category = categories.find((c) => c.id === categoryId)
    if (category) {
      activeFilters.push({
        type: "category" as const,
        id: categoryId,
        label: category.name || category.handle || "Category",
        onRemove: () => removeCategory(categoryId),
      })
    }
  })

  // Add brand filters
  selectedBrandIds.forEach((brandId) => {
    const brand = brands.find((b) => b.id === brandId)
    if (brand) {
      activeFilters.push({
        type: "brand" as const,
        id: brandId,
        label: brand.name || t("filters.brand"),
        onRemove: () => removeBrand(brandId),
      })
    }
  })

  // Add price filter
  if (selectedPriceRange) {
    const priceLabel = formatPriceRange(selectedPriceRange)
    activeFilters.push({
      type: "price" as const,
      id: "price",
      label: priceLabel,
      onRemove: removePrice,
    })
  }

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map((filter) => (
        <Badge
          key={`${filter.type}-${filter.id}`}
          variant="secondary"
          className="flex items-center gap-1 py-1.5 pl-2.5 pr-1 bg-muted text-foreground hover:bg-muted/80"
        >
          <span>{filter.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={filter.onRemove}
            className="h-5 w-5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
            aria-label="Remove filter"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Badge>
      ))}
    </div>
  )
}

export default ActiveFilters
