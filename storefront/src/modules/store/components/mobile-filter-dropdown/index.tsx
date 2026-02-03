'use client'

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import FilterCollection from "../refinement-list/filter-collection"
import FilterCategory from "../refinement-list/filter-category"
import FilterBrand from "../refinement-list/filter-brand"
import FilterPrice from "../refinement-list/filter-price"

type MobileFilterDropdownProps = {
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
  "data-testid"?: string
}

const MobileFilterDropdown = ({
  collections,
  categories,
  brands,
  maxPrice,
  "data-testid": dataTestId,
}: MobileFilterDropdownProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const createQueryString = useCallback(
    (name: string, value: string | string[]) => {
      const params = new URLSearchParams(searchParams)
      if (Array.isArray(value)) {
        // Handle array values (for multiple selections)
        params.delete(name)
        if (value.length > 0) {
          value.forEach((v) => {
            if (v) {
              params.append(name, v)
            }
          })
        }
      } else {
        // Handle single values
        if (value) {
          params.set(name, value)
        } else {
          params.delete(name)
        }
      }
      // Reset to page 1 when filters change
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = useCallback((name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`, { scroll: false })
  }, [pathname, createQueryString, router])

  const setQueryParamsArray = useCallback((name: string, values: string[]) => {
    const query = createQueryString(name, values)
    router.push(`${pathname}?${query}`, { scroll: false })
  }, [pathname, createQueryString, router])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    const collectionIds = searchParams.getAll("collection").filter(Boolean)
    const categoryIds = searchParams.getAll("category").filter(Boolean)
    const brandIds = searchParams.getAll("brand").filter(Boolean)
    const priceRange = searchParams.get("price")

    count += collectionIds.length
    count += categoryIds.length
    count += brandIds.length
    if (priceRange) count += 1

    return count
  }, [searchParams])

  const handleToggle = () => {
    setOpen(!open)
  }

  // Prevent body scroll when filter is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      {/* Filter Button */}
      <div className="w-full relative z-50">
        <Button
          onClick={handleToggle}
          className={`flex items-center justify-between px-4 relative w-full min-h-12 font-medium text-[15px] text-white bg-[#1A1A1A] hover:bg-[#353535] transition-colors rounded-b-xl ${open ? "rounded-b-none" : ""}`}
          data-testid={dataTestId}
          aria-label="Отвори филтри"
          aria-expanded={open}
        >
          <span>
            {(() => {
              const translated = t("filters.openFilters")
              return translated === "filters.openFilters" ? "Отвори филтри" : translated
            })()}
          </span>
          <span className="flex items-center gap-2 ml-auto">
            {activeFilterCount > 0 && (
              <Badge className="absolute right-10 bg-primary text-primary-foreground text-[10px] min-w-4 h-4 px-1">
                {activeFilterCount}
              </Badge>
            )}
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </Button>

        {/* Filter Panel - Positioned absolutely below button with animation */}
        {open && (
          <div
            className="absolute top-full left-0 right-0 bg-[#2d2d2d] rounded-b-2xl overflow-hidden z-50 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex flex-col gap-6">
                {/* Categories Filter */}
                {categories && categories.length > 0 && (
                  <FilterCategory
                    categories={categories}
                    setQueryParamsArray={setQueryParamsArray}
                    darkMode={true}
                  />
                )}

                {/* Brands Filter */}
                {brands && brands.length > 0 && (
                  <FilterBrand
                    brands={brands}
                    setQueryParamsArray={setQueryParamsArray}
                    darkMode={true}
                  />
                )}

                {/* Price Filter */}
                {maxPrice && maxPrice > 0 && (
                  <FilterPrice
                    setQueryParams={setQueryParams}
                    maxPrice={maxPrice}
                    darkMode={true}
                  />
                )}

                {/* Collections Filter */}
                {collections && collections.length > 0 && (
                  <FilterCollection
                    collections={collections}
                    setQueryParamsArray={setQueryParamsArray}
                    darkMode={true}
                  />
                )}

                <Separator className="bg-white/10" />

                {/* Apply/Close Button */}
                <Button
                  onClick={handleToggle}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl"
                >
                  {t("filters.apply") || "Затвори и приложи филтрите"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={handleToggle}
          aria-hidden
        />
      )}
    </>
  )
}

export default MobileFilterDropdown
