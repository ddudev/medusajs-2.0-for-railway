"use client"

import { Popover, Transition } from "@headlessui/react"
import { XMark, ArrowLeft, ChevronRight } from "@medusajs/icons"
import React, { Fragment, useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// React 19 + Headless UI: Headless types return Element, React 19 expects ReactNode. Cast to any so TS accepts as valid JSX.
const PopoverRoot = Object.assign(Popover as any, {
  Button: Popover.Button as any,
  Panel: Popover.Panel as any,
})
const TransitionRoot = Transition as any

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { HttpTypes } from "@medusajs/types"

import { usePathname } from "next/navigation"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories?: HttpTypes.StoreProductCategory[]
  /** Custom trigger (e.g. orange "Всички продукти" button). When set, panel can use narrow width on desktop. */
  triggerSlot?: (props: { open: boolean; close: () => void }) => React.ReactNode
  /** "narrow" = drawer panel max 400px on desktop (no horizontal scroll); "full" = full width (mobile). */
  panelWidth?: "full" | "narrow"
}

type ViewStackItem =
  | { type: "main" }
  | { type: "subcategory"; category: HttpTypes.StoreProductCategory }
type SlideDirection = "left" | "right"

const SideMenu = ({ categories = [], triggerSlot, panelWidth = "full" }: SideMenuProps) => {
  const isNarrow = panelWidth === "narrow"
  const pathname = usePathname()
  const closeMenuRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    closeMenuRef.current?.()
  }, [pathname])

  const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ type: "main" }])
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("left")

  const currentView = viewStack[viewStack.length - 1]

  const handleCategoryClick = (category: HttpTypes.StoreProductCategory, close: () => void) => {
    const hasChildren = category.category_children && category.category_children.length > 0

    if (hasChildren) {
      setSlideDirection("left")
      setViewStack((prev) => [...prev, { type: "subcategory", category }])
    } else {
      close()
    }
  }

  const handleBack = () => {
    setSlideDirection("right")
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }

  const handleSubcategoryClick = (close: () => void) => {
    close()
  }

  const handleClose = (close: () => void) => {
    setViewStack([{ type: "main" }])
    close()
  }

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <PopoverRoot className="h-full flex">
          {({ open, close }: { open: boolean; close: () => void }) => {
            closeMenuRef.current = close
            return (
            <>
              <div className="relative flex h-full">
                <PopoverRoot.Button
                  as={Fragment}
                  data-testid="nav-menu-button"
                >
                  {({ open, close }: { open: boolean; close: () => void }) =>
                    triggerSlot ? (
                      triggerSlot({ open, close })
                    ) : (
                      <button
                        type="button"
                        className="relative p-2 transition-all ease-out duration-200 border border-border-base rounded-lg focus:outline-none text-base md:bg-transparent md:text-text-secondary md:hover:text-text-primary"
                      >
                        <svg
                          className="w-6 h-6 md:w-5 md:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                        <span className="hidden lg:inline">Menu</span>
                      </button>
                    )
                  }
                </PopoverRoot.Button>
              </div>

              {/* Header height: TopHeader 64px md:84px + MainHeader 60px = 144px on desktop */}
              <TransitionRoot
                show={open}
                as={Fragment}
              >
                <PopoverRoot.Panel
                  className={
                    isNarrow
                      ? "fixed left-0 right-0 bottom-0 z-[110] bg-transparent md:top-[144px] md:flex md:flex-row md:items-stretch"
                      : "fixed top-0 left-0 right-0 bottom-0 z-[110] bg-transparent md:hidden"
                  }
                >
                  {/* Backdrop: full opacity from start (no white flash); full-screen on mobile, flex-fill on desktop */}
                  {!isNarrow && (
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => handleClose(close)}
                      aria-hidden
                    />
                  )}
                  {/* Drawer panel - only element that slides in; no full-screen white layer */}
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={
                      isNarrow
                        ? "absolute inset-y-0 left-0 w-full bg-white flex flex-col overflow-hidden md:relative md:w-[400px] md:max-w-[90vw] md:flex-shrink-0 md:shadow-xl md:z-10"
                        : "absolute inset-0 w-full bg-white flex flex-col overflow-hidden"
                    }
                  >
                    {/* Header - Clean with orange close button */}
                    <div className="bg-white flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0 border-b border-border-base shadow-lg z-10">
                      {currentView.type === "subcategory" && (
                        <button
                          onClick={handleBack}
                          className="flex items-center gap-1 text-xs text-gray-600"
                          aria-label="Назад"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="font-medium">Назад</span>
                        </button>
                      )}

                      {currentView.type === "subcategory" && (
                        <h2 className="text-gray-800 font-semibold text-sm flex-1 text-center">
                          {currentView.category.name}
                        </h2>
                      )}
                      
                      <button
                        data-testid="close-menu-button"
                        onClick={() => handleClose(close)}
                        className="flex items-center gap-1 bg-neutral-100 text-neutral-500 p-2 rounded-full hover:bg-neutral-300 transition-colors ml-auto font-medium text-xs"
                        aria-label="Затвори"
                      >
                        <XMark className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
                      <AnimatePresence mode="wait" initial={false}>
                        {currentView.type === "main" ? (
                          <motion.div
                            key="main"
                            initial={{ x: slideDirection === "right" ? "-100%" : 0 }}
                            animate={{ x: 0 }}
                            exit={{ x: slideDirection === "left" ? "-100%" : "100%" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="min-h-full"
                          >
                            <MainMenuView
                              categories={categories}
                              onCategoryClick={(category) => handleCategoryClick(category, close)}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`subcategory-${currentView.category.id}`}
                            initial={{ x: slideDirection === "left" ? "100%" : 0 }}
                            animate={{ x: 0 }}
                            exit={{ x: slideDirection === "right" ? "100%" : "-100%" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="min-h-full"
                          >
                            <SubcategoryMenuView
                              category={currentView.category}
                              onSubcategoryClick={() => handleSubcategoryClick(close)}
                              onCategoryWithChildrenClick={(category) =>
                                handleCategoryClick(category, close)
                              }
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                  {/* Desktop backdrop: full opacity from start so no white flash; fills area right of drawer */}
                  {isNarrow && (
                    <div
                      className="hidden md:block flex-1 bg-black/50 min-w-0"
                      onClick={() => handleClose(close)}
                      aria-hidden
                    />
                  )}
                </PopoverRoot.Panel>
              </TransitionRoot>
            </>
            )
          }}
        </PopoverRoot>
      </div>
    </div>
  )
}

// Main Menu View Component
const MainMenuView = ({
  categories,
  onCategoryClick,
}: {
  categories: HttpTypes.StoreProductCategory[]
  onCategoryClick: (category: HttpTypes.StoreProductCategory) => void
}) => {

  const { t } = useTranslation()

  return (
    <ul className="divide-y divide-gray-200">
      <li>
        <LocalizedClientLink
          href="/store"
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 active:bg-orange-50 transition-colors"
        >
          <span className="text-base font-medium text-gray-800">
            {t("common.allProducts") || "Всички продукти"}
          </span>
        </LocalizedClientLink>
      </li>
      {categories.map((category) => {
        const hasChildren = category.category_children && category.category_children.length > 0

        return (
          <li key={category.id}>
            {hasChildren ? (
              <button
                onClick={() => onCategoryClick(category)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 active:bg-orange-50 transition-colors text-left"
              >
                <span className="text-base font-medium text-gray-800">
                  {category.name}
                </span>
                <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
              </button>
            ) : (
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 active:bg-orange-50 transition-colors"
              >
                <span className="text-base font-medium text-gray-800">
                  {category.name}
                </span>
              </LocalizedClientLink>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Subcategory Menu View Component (supports 3+ levels: items with children drill down)
const SubcategoryMenuView = ({
  category,
  onSubcategoryClick,
  onCategoryWithChildrenClick,
}: {
  category: HttpTypes.StoreProductCategory | null
  onSubcategoryClick: () => void
  onCategoryWithChildrenClick?: (category: HttpTypes.StoreProductCategory) => void
}) => {
  if (!category || !category.category_children) {
    return null
  }

  return (
    <ul className="divide-y divide-gray-200">
      {category.category_children.map((subcategory) => {
        const hasChildren =
          subcategory.category_children && subcategory.category_children.length > 0

        if (hasChildren && onCategoryWithChildrenClick) {
          return (
            <li key={subcategory.id}>
              <button
                type="button"
                onClick={() => onCategoryWithChildrenClick(subcategory)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <span className="text-[15px] text-gray-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{subcategory.name}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
              </button>
            </li>
          )
        }

        return (
          <li key={subcategory.id}>
            <LocalizedClientLink
              href={`/categories/${subcategory.handle}`}
              onClick={onSubcategoryClick}
              className="block px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="text-[15px] text-gray-600 flex items-start">
                <span className="mr-2">•</span>
                <span>{subcategory.name}</span>
              </span>
            </LocalizedClientLink>
          </li>
        )
      })}
    </ul>
  )
}

export default SideMenu
