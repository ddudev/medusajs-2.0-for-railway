import { model } from "@medusajs/framework/utils"

export const InnProImportSession = model.define("innpro_import_session", {
  id: model.id().primaryKey(),
  xml_url: model.text(),
  xml_file_path: model.text().nullable(), // Path to saved XML file on disk for streaming import
  parsed_data: model.json().nullable(),
  selected_categories: model.json().nullable(),
  selected_brands: model.json().nullable(),
  selected_product_ids: model.json().nullable(),
  status: model.text(),
  // created_at, updated_at, and deleted_at are automatically added by MedusaJS
})
