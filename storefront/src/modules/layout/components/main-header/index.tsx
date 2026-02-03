import MainHeaderBar from "@modules/layout/components/main-header/main-header-bar"
import { HttpTypes } from "@medusajs/types"

const MainHeader = async ({
  countryCode,
  categories = [],
}: {
  countryCode: string
  categories?: HttpTypes.StoreProductCategory[]
}) => {
  const displayCategories =
    categories && categories.length > 0
      ? categories.filter((cat) => !cat.parent_category).slice(0, 20)
      : []

  return (
    <div
      className="hidden md:block w-full bg-black relative overflow-visible"
      style={{ height: "60px" }}
    >
      {/* Black bar: orange "Всички продукти" opens categories drawer (same as mobile, narrow width); no horizontal scroll */}
      <MainHeaderBar countryCode={countryCode} displayCategories={displayCategories} />
    </div>
  )
}

export default MainHeader

