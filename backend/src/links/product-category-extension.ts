import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import CategoryExtensionModule from "../modules/category-extension"

// Match brand link pattern: first argument is config object with linkable + isList
const categoryExtensionLinkable = CategoryExtensionModule.linkable?.categoryExtension

if (!categoryExtensionLinkable) {
  throw new Error(
    "CategoryExtensionModule.linkable.categoryExtension is undefined! Cannot create link."
  )
}

const linkDefinition = defineLink(
  {
    linkable: ProductModule.linkable.productCategory,
    isList: false,
  },
  categoryExtensionLinkable
)

export default linkDefinition
