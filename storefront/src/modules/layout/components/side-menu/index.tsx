"use client"

import { Popover, Transition } from "@headlessui/react"
import { XMark, ArrowLeft, ChevronRight } from "@medusajs/icons"
import { Fragment, useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { HttpTypes } from "@medusajs/types"

import { usePathname } from "next/navigation"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories?: HttpTypes.StoreProductCategory[]
}

type ViewType = "main" | "subcategory"
type SlideDirection = "left" | "right"

const SideMenu = ({ categories = [] }: SideMenuProps) => {
  const pathname = usePathname()
  const closeMenuRef = useRef<(() => void) | null>(null)

  // Close menu when route changes (e.g. after clicking a link)
  useEffect(() => {
    closeMenuRef.current?.()
  }, [pathname])

  const [currentView, setCurrentView] = useState<ViewType>("main")
  const [selectedCategory, setSelectedCategory] = useState<HttpTypes.StoreProductCategory | null>(null)
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("left")

  const handleCategoryClick = (category: HttpTypes.StoreProductCategory, close: () => void) => {
    const hasChildren = category.category_children && category.category_children.length > 0
    
    if (hasChildren) {
      setSelectedCategory(category)
      setSlideDirection("left")
      setCurrentView("subcategory")
    } else {
      // No children, navigate directly to PLP
      close()
    }
  }

  const handleBack = () => {
    setSlideDirection("right")
    setCurrentView("main")
    setSelectedCategory(null)
  }

  const handleSubcategoryClick = (close: () => void) => {
    close()
  }

  const handleClose = (close: () => void) => {
    // Reset state when closing
    setCurrentView("main")
    setSelectedCategory(null)
    close()
  }

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => {
            closeMenuRef.current = close
            return (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
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
                </Popover.Button>
              </div>

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Popover.Panel className="fixed top-0 left-0 right-0 bottom-0 z-[60] md:hidden">
                  <div className="absolute inset-0 bg-black/50" onClick={() => handleClose(close)} />
                  
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0 w-full bg-white flex flex-col overflow-hidden"
                  >
                    {/* Header - Clean with orange close button */}
                    <div className="bg-white flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0 border-b border-border-base shadow-lg z-10">
                      {currentView === "subcategory" && (
                        <button
                          onClick={handleBack}
                          className="flex items-center gap-1 text-xs text-gray-600"
                          aria-label="Назад"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="font-medium">Назад</span>
                        </button>
                      )}
                      
                      {currentView === "subcategory" && selectedCategory && (
                        <h2 className="text-gray-800 font-semibold text-sm flex-1 text-center">
                          {selectedCategory.name}
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
                        {currentView === "main" ? (
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
                            key="subcategory"
                            initial={{ x: slideDirection === "left" ? "100%" : 0 }}
                            animate={{ x: 0 }}
                            exit={{ x: slideDirection === "right" ? "100%" : "-100%" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="min-h-full"
                          >
                            <SubcategoryMenuView
                              category={selectedCategory}
                              onSubcategoryClick={() => handleSubcategoryClick(close)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </Popover.Panel>
              </Transition>
            </>
            )
          }}
        </Popover>
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

// Subcategory Menu View Component
const SubcategoryMenuView = ({
  category,
  onSubcategoryClick,
}: {
  category: HttpTypes.StoreProductCategory | null
  onSubcategoryClick: () => void
}) => {
  if (!category || !category.category_children) {
    return null
  }

  return (
    <ul className="divide-y divide-gray-200">
      {category.category_children.map((subcategory) => (
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
      ))}
    </ul>
  )
}

export default SideMenu
