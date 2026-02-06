import { Module } from "@medusajs/framework/utils"
import CategoryExtensionModuleService from "./service"
import { CategoryExtension } from "./models/category-extension"

export const CATEGORY_EXTENSION_MODULE = "categoryExtensionModule"

const moduleDefinition = Module(CATEGORY_EXTENSION_MODULE, {
  service: CategoryExtensionModuleService,
  linkable: {
    categoryExtension: CategoryExtension,
  },
} as any)

export default moduleDefinition
