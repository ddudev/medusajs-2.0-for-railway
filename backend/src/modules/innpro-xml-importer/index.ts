import InnProXmlImporterService from "./service"
import { Module } from "@medusajs/framework/utils"

export const INNPRO_XML_IMPORTER_MODULE = "innproXmlImporter"

export default Module(INNPRO_XML_IMPORTER_MODULE, {
  service: InnProXmlImporterService,
})
