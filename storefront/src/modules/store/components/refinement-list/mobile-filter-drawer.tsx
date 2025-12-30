"use client"

import { Fragment } from "react"
import { Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
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
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100 backdrop-blur-2xl"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 backdrop-blur-2xl"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-black/50 z-[49] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      </Transition>

      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
          <div className="flex flex-col fixed inset-0 w-full h-full z-50 bg-white pointer-events-auto">
            <div className="flex flex-col h-full bg-white justify-between p-6">
              <div className="flex justify-end mb-4">
                <button
                  data-testid="close-filters-button"
                  onClick={onClose}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Close filters"
                >
                  <XMark className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-8">
                  <h2 className="text-2xl font-semibold text-text-primary mb-2">
                    {t("filters.title") || "Филтри"}
                  </h2>

                  <FilterCollection
                    collections={collections}
                    setQueryParamsArray={setQueryParamsArray}
                  />
                  <FilterCategory
                    categories={categories}
                    setQueryParamsArray={setQueryParamsArray}
                  />
                  <FilterBrand
                    brands={brands || []}
                    setQueryParamsArray={setQueryParamsArray}
                  />
                  <FilterPrice
                    setQueryParams={setQueryParams}
                    maxPrice={maxPrice}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-base">
                <button
                  onClick={onClose}
                  className="w-full py-3 px-6 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  {t("filters.apply") || "Приложи"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </>
  )
}

export default MobileFilterDrawer

