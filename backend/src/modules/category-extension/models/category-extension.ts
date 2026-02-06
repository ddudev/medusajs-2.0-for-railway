import { model } from "@medusajs/framework/utils"

export const CategoryExtension = model.define("category_extension", {
  id: model.id().primaryKey(),
  original_name: model.text().index(),
  external_id: model.text().index().nullable(),
  description: model.text().nullable(),
  seo_title: model.text().nullable(),
  seo_meta_description: model.text().nullable(),
})
