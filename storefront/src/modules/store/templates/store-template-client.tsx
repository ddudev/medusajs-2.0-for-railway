"use client"

import { useState, createContext, useContext } from "react"
import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import MobileFilterDrawer from "@modules/store/components/refinement-list/mobile-filter-drawer"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

type StoreTemplateClientProps = {
  children: React.ReactNode
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
  filterKey: string
  sort: string
  pageNumber: number
  countryCode: string
  collectionIds?: string[]
  categoryIds?: string[]
  brandIds?: string[]
  priceRange?: string
  translations: any
}

type FilterContextType = {
  openFilterDrawer: () => void
}

const FilterContext = createContext<FilterContextType | null>(null)

export const useFilterContext = () => {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error("useFilterContext must be used within StoreTemplateClient")
  }
  return context
}

const StoreTemplateClient = ({
  children,
  collections,
  categories,
  brands,
  maxPrice,
}: StoreTemplateClientProps) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  const setQueryParamsArray = (name: string, values: string[]) => {
    const query = createQueryString(name, values)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  const openFilterDrawer = useCallback(() => {
    setIsFilterDrawerOpen(true)
  }, [])

  return (
    <FilterContext.Provider value={{ openFilterDrawer }}>
      {children}
      <MobileFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        collections={collections}
        categories={categories}
        brands={brands}
        maxPrice={maxPrice}
        setQueryParams={setQueryParams}
        setQueryParamsArray={setQueryParamsArray}
      />
    </FilterContext.Provider>
  )
}

export default StoreTemplateClient

