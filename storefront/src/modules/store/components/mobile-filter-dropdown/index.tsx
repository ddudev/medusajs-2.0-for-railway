'use client'

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button, Divider, Badge, Fade, Grow } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'
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
          endIcon={open ? <KeyboardArrowUp sx={{ color: 'white', fontSize: '1.25rem' }} /> : <KeyboardArrowDown sx={{ color: 'white', fontSize: '1.25rem' }} />}
          fullWidth
          className="flex items-center justify-between px-4 transition-colors relative"
          sx={{
            color: 'white',
            fontWeight: 500,
            fontSize: '0.9375rem',
            textTransform: 'none',
            borderRadius: open ? '0 0 0 0' : '0 0 12px 12px',
            backgroundColor: '#1A1A1A',
            justifyContent: 'space-between',
            minHeight: '48px',
            transition: 'background-color 0.2s ease, border-radius 0.4s ease',
            '&:hover': {
              backgroundColor: '#353535',
            },
            '& .MuiButton-endIcon': {
              marginLeft: 'auto',
            },
          }}
          data-testid={dataTestId}
          aria-label="Отвори филтри"
          aria-expanded={open}
        >
          <span className="text-[15px] font-medium text-white">
            {(() => {
              const translated = t("filters.openFilters")
              return translated === "filters.openFilters" ? "Отвори филтри" : translated
            })()}
          </span>
          {activeFilterCount > 0 && (
            <Badge
              badgeContent={activeFilterCount}
              color="primary"
              sx={{
                position: 'absolute',
                right: '40px',
                '& .MuiBadge-badge': {
                  fontSize: '0.625rem',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  backgroundColor: '#519717',
                  color: 'white',
                },
              }}
            />
          )}
        </Button>

        {/* Filter Panel - Positioned absolutely below button with animation */}
        <Grow
          in={open}
          timeout={400}
          style={{ transformOrigin: 'top center' }}
          unmountOnExit
        >
          <div 
            className="absolute top-full left-0 right-0 bg-[#2d2d2d] rounded-b-2xl overflow-hidden z-50"
            style={{
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              maxHeight: 'calc(100vh - 200px)',
            }}
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

                <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Apply/Close Button */}
                <Button
                  onClick={handleToggle}
                  fullWidth
                  variant="contained"
                  sx={{
                    bgcolor: '#519717',
                    color: 'white',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: '12px',
                    '&:hover': {
                      bgcolor: '#4a8514',
                    },
                  }}
                >
                  {t("filters.apply") || "Затвори и приложи филтрите"}
                </Button>
              </div>
            </div>
          </div>
        </Grow>
      </div>

      {/* Backdrop overlay with fade animation */}
      <Fade in={open} timeout={350} unmountOnExit>
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleToggle}
          style={{
            backdropFilter: 'blur(2px)',
          }}
        />
      </Fade>
    </>
  )
}

export default MobileFilterDropdown
