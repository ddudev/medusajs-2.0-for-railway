"use client"

import { Fragment } from "react"
import { Transition } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import FilterCollection from "./filter-collection"
import FilterCategory from "./filter-category"
import FilterBrand from "./filter-brand"
import FilterPrice from "./filter-price"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type MobileFilterDrawerProps = {
  isOpen: boolean
  onClose: () => void
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
  setQueryParams: (name: string, value: string) => void
  setQueryParamsArray: (name: string, values: string[]) => void
}

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  collections,
  categories,
  brands,
  maxPrice,
  setQueryParams,
  setQueryParamsArray,
}: MobileFilterDrawerProps) => {
  const { t } = useTranslation()

  return (
    <>
      {/* Backdrop */}
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition-opacity ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-black/50 z-[49] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      </Transition>

      {/* Dropdown Panel */}
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 -translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-4"
      >
        <div className="fixed top-16 left-4 right-4 z-50 md:hidden">
          <div className="bg-[#2d2d2d] rounded-2xl shadow-2xl max-h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {t("filters.title") || "Филтри"}
              </h2>
            </div>

            {/* Filters Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-6">
                <FilterCategory
                  categories={categories}
                  setQueryParamsArray={setQueryParamsArray}
                  darkMode={true}
                />
                <FilterBrand
                  brands={brands || []}
                  setQueryParamsArray={setQueryParamsArray}
                  darkMode={true}
                />
                <FilterPrice
                  setQueryParams={setQueryParams}
                  maxPrice={maxPrice}
                  darkMode={true}
                />
                <FilterCollection
                  collections={collections}
                  setQueryParamsArray={setQueryParamsArray}
                  darkMode={true}
                />
              </div>
            </div>

            {/* Apply Button */}
            <div className="px-6 py-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {t("filters.apply") || "Затвори и приложи филтрите"}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </>
  )
}

export default MobileFilterDrawer

