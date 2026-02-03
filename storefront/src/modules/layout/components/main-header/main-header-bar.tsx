"use client"

import SideMenu from "@modules/layout/components/side-menu"
import { HttpTypes } from "@medusajs/types"

type MainHeaderBarProps = {
  countryCode: string
  displayCategories: HttpTypes.StoreProductCategory[]
}

export default function MainHeaderBar({
  countryCode,
  displayCategories,
}: MainHeaderBarProps) {
  return (
    <div className="content-container h-full relative">
      {/* Left: Orange "Всички продукти" button - opens categories drawer on desktop (same as mobile menu, narrow width) */}
      <div className="absolute left-6 top-0 z-10" style={{ height: "72px" }}>
        <SideMenu
          categories={displayCategories}
          regions={[]}
          panelWidth="narrow"
          triggerSlot={() => (
            <button
              type="button"
              className="flex items-center gap-2 bg-primary text-white px-4 rounded-b-lg rounded-t-none hover:bg-primary-hover transition-colors whitespace-nowrap font-medium h-full"
              style={{ height: "72px" }}
              aria-label="Всички продукти - отвори меню"
            >
              <svg
                className="w-5 h-5"
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
              <span>Всички продукти</span>
            </button>
          )}
        />
      </div>

      <nav className="flex items-center gap-6 h-full ml-[220px]">
        {/* Category links removed - drawer replaces horizontal scroll */}
      </nav>
    </div>
  )
}
