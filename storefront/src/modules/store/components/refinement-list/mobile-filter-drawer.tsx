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

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

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
        enter="transition-opacity ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-black/50 z-[100] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      </Transition>

      {/* Панел: слайдва от дясно, заема целия екран (като мобилното меню) */}
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="translate-x-full"
        enterTo="translate-x-0"
        leave="transition ease-in duration-250"
        leaveFrom="translate-x-0"
        leaveTo="translate-x-full"
      >
        <div className="fixed top-0 right-0 bottom-0 w-[95%] z-[100] md:hidden">
          <div className="bg-background-elevated h-full w-full shadow-2xl flex flex-col">
            {/* Заглавна лента: текст "Филтриране" + бутон X за затваряне */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold ">
                Филтриране
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -m-2 hover:bg-white/10 rounded-full transition-colors touch-manipulation"
                aria-label="Затвори филтри"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-6">
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
                <FilterCollection
                  collections={collections}
                  setQueryParamsArray={setQueryParamsArray}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {t("filters.apply") || "Приложи филтрите"}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </>
  )
}

export default MobileFilterDrawer
