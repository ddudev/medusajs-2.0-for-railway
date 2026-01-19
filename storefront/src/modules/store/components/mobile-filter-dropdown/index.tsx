'use client'

import { useState, useRef, useMemo, useCallback } from "react"
import { Button, Menu, MenuItem, Paper, Divider, Badge } from '@mui/material'
import { KeyboardArrowDown } from '@mui/icons-material'
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleClick}
        endIcon={<KeyboardArrowDown sx={{ color: 'white', fontSize: '1.25rem' }} />}
        fullWidth
        className="flex items-center justify-between px-4 transition-colors relative"
        sx={{
          color: 'white',
          fontWeight: 500,
          fontSize: '0.9375rem',
          textTransform: 'none',
          borderRadius: '0 0 12px 12px',
          backgroundColor: '#1A1A1A',
          justifyContent: 'space-between',
          minHeight: '48px',
          '&:hover': {
            backgroundColor: '#353535',
          },
          '& .MuiButton-endIcon': {
            marginLeft: 'auto',
          },
        }}
        data-testid={dataTestId}
        aria-label="Отвори филтри"
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

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 320,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            bgcolor: '#1a1a1a',
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
        }}
        MenuListProps={{
          sx: {
            py: 2,
            px: 2,
          },
        }}
      >
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            {t("filters.title") || "Филтри"}
          </h3>

          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />

          {/* Collections Filter */}
          {collections && collections.length > 0 && (
            <div>
              <FilterCollection
                collections={collections}
                setQueryParamsArray={setQueryParamsArray}
              />
            </div>
          )}

          {/* Categories Filter */}
          {categories && categories.length > 0 && (
            <div>
              <FilterCategory
                categories={categories}
                setQueryParamsArray={setQueryParamsArray}
              />
            </div>
          )}

          {/* Brands Filter */}
          {brands && brands.length > 0 && (
            <div>
              <FilterBrand
                brands={brands}
                setQueryParamsArray={setQueryParamsArray}
              />
            </div>
          )}

          {/* Price Filter */}
          {maxPrice && maxPrice > 0 && (
            <div>
              <FilterPrice
                setQueryParams={setQueryParams}
                maxPrice={maxPrice}
              />
            </div>
          )}

          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />

          {/* Apply/Close Button */}
          <Button
            onClick={handleClose}
            fullWidth
            variant="contained"
            sx={{
              bgcolor: '#519717',
              color: 'white',
              fontWeight: 600,
              py: 1.5,
              borderRadius: '8px',
              '&:hover': {
                bgcolor: '#4a8514',
              },
            }}
          >
            {t("filters.apply") || "Приложи"}
          </Button>
        </div>
      </Menu>
    </>
  )
}

export default MobileFilterDropdown
