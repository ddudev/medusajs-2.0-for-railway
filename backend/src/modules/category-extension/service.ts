import { MedusaService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { CategoryExtension } from "./models/category-extension"

type InjectedDependencies = {
  logger: Logger
}

class CategoryExtensionModuleService extends MedusaService({
  CategoryExtension,
}) {
  protected readonly logger_: Logger

  constructor(container: InjectedDependencies) {
    // @ts-ignore - MedusaService constructor
    super(...arguments)
    this.logger_ = container.logger
  }
}

export default CategoryExtensionModuleService
