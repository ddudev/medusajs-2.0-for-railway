import { model } from "@medusajs/framework/utils"

export const InnProImportConfig = model.define("innpro_import_config", {
  id: model.id().primaryKey(),
  price_xml_url: model.text(),
  enabled: model.boolean().default(true),
  update_inventory: model.boolean().default(true),
  // created_at, updated_at, and deleted_at are automatically added by MedusaJS
})
