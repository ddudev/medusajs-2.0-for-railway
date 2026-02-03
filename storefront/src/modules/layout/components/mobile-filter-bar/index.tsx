'use client'

import { useState, useMemo, useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import MobileSortButton from "@modules/store/components/mobile-sort-button"
import MobileFilterDrawer from "@modules/store/components/refinement-list/mobile-filter-drawer"
import { useSearchParams, useRouter } from "next/navigation"

type MobileFilterBarProps = {
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
}

const FilterIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

/**
 * Sticky mobile filter bar with Sort and Filter buttons
 * Only visible on mobile and only on product listing pages (PLP)
 */
const MobileFilterBar = ({
  collections,
  categories,
  brands,
  maxPrice,
}: MobileFilterBarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const createQueryString = useCallback(
    (name: string, value: string | string[]) => {
      const params = new URLSearchParams(searchParams)
      if (Array.isArray(value)) {
        params.delete(name)
        if (value.length > 0) {
          value.forEach((v) => {
            if (v) params.append(name, v)
          })
        }
      } else {
        if (value) params.set(name, value)
        else params.delete(name)
      }
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

  const activeFilterCount = useMemo(() => {
    let count = 0
    count += searchParams.getAll("collection").filter(Boolean).length
    count += searchParams.getAll("category").filter(Boolean).length
    count += searchParams.getAll("brand").filter(Boolean).length
    if (searchParams.get("price")) count += 1
    return count
  }, [searchParams])

  const handleFilterClick = () => setFilterDrawerOpen(true)
  const handleFilterClose = () => setFilterDrawerOpen(false)

  useEffect(() => {
    if (filterDrawerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [filterDrawerOpen])

  const isPLPPage = pathname?.includes("/store") || pathname?.includes("/categories")
  if (!isPLPPage) {
    return null
  }

  return (
    <>
      <div className="md:hidden sticky top-[64px] z-40 bg-[#F9FAFB] border-b border-t border-neutral-2 shadow-sm">
        <div className="content-container">
          <div className="flex items-center w-full">
            <MobileSortButton />

            <button
              type="button"
              onClick={handleFilterClick}
              className="flex items-center justify-center gap-2 flex-1 px-4 min-h-[48px] text-sm transition-colors relative"
              aria-label="Отвори филтри"
              aria-expanded={filterDrawerOpen}
            >
              <FilterIcon />
              <span>Филтри</span>
              {activeFilterCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <MobileFilterDrawer
        isOpen={filterDrawerOpen}
        onClose={handleFilterClose}
        collections={collections}
        categories={categories}
        brands={brands}
        maxPrice={maxPrice}
        setQueryParams={setQueryParams}
        setQueryParamsArray={setQueryParamsArray}
      />
    </>
  )
}

export default MobileFilterBar
