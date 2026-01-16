import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getCategoriesList } from "@lib/data/categories"
import { getTranslations } from "@lib/i18n/server"

import CategoryMenuItem from "./category-menu-item"

const CategoryNav = async ({ countryCode }: { countryCode: string }) => {
  const { product_categories } = await getCategoriesList(0, 100)
  const translations = await getTranslations(countryCode)

  const displayCategories =
    product_categories && product_categories.length > 0
      ? product_categories
        .filter((cat) => !cat.parent_category)
        .slice(0, 20)
      : []

  return (
    <div className="hidden md:block w-full bg-black">
      <div className="content-container">
        <nav className="flex items-center gap-6 py-3">
          {/* Category Links - White text on black background, on same line as All Products */}
          {displayCategories.length > 0 && (
            <div className="flex items-center gap-6">
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

export default CategoryNav

