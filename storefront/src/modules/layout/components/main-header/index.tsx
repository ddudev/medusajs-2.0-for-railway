import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MobileMenu from "@modules/layout/components/mobile-menu"
import CategoryMenuItem from "@modules/layout/components/category-nav/category-menu-item"
import { HttpTypes } from "@medusajs/types"

const MainHeader = async ({
  countryCode,
  categories = []
}: {
  countryCode: string
  categories?: HttpTypes.StoreProductCategory[]
}) => {
  const displayCategories =
    categories && categories.length > 0
      ? categories.filter((cat) => !cat.parent_category).slice(0, 20)
      : []

  return (
    <div className="hidden md:block w-full bg-black relative overflow-visible" style={{ height: '60px' }}>
      {/* Navigation bar - black background with orange All Products button and category links on same line */}
      <div className="content-container h-full relative">
        {/* Left: Orange All Products Button - 72px height, rounded only on bottom, overflowing downward by 12px - Absolute positioned */}
        <LocalizedClientLink
          href="/store"
          className="absolute left-6 top-0 flex items-center gap-2 bg-primary text-white px-4 rounded-b-lg rounded-t-none hover:bg-primary-hover transition-colors whitespace-nowrap font-medium z-10"
          style={{
            height: '72px'
          }}
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
        </LocalizedClientLink>

        <nav className="flex items-center gap-6 h-full">
          {/* Mobile Menu - hidden on desktop */}
          <div className="md:hidden">
            <MobileMenu regions={[]} categories={displayCategories} />
          </div>

          {/* Category Links - White text on black background, on same line - with left margin to account for button */}
          {displayCategories.length > 0 && (
            <div className="hidden md:flex items-center gap-6 ml-[220px]">
              {displayCategories.map((category) => (
                <CategoryMenuItem key={category.handle} category={category} />
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

export default MainHeader

