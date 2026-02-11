import { MedusaService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { AnalyticsSettings } from "./models"

type InjectedDependencies = {
  logger: Logger
}

class AnalyticsSettingsModuleService extends MedusaService({
  AnalyticsSettings,
}) {
  protected readonly logger_: Logger

  constructor(container: InjectedDependencies) {
    // @ts-ignore - MedusaService constructor
    super(...arguments)
    this.logger_ = container.logger
  }

  async getPosthogEmbedUrl(): Promise<string | null> {
    const list = await this.listAnalyticsSettings({})
    const row = list[0]
    return row?.posthog_dashboard_embed_url ?? null
  }

  async setPosthogEmbedUrl(url: string | null): Promise<{ posthog_dashboard_embed_url: string | null }> {
    const list = await this.listAnalyticsSettings({})
    if (list.length > 0) {
      await this.updateAnalyticsSettings({ id: list[0].id }, { posthog_dashboard_embed_url: url })
    } else {
      await this.createAnalyticsSettings([{ posthog_dashboard_embed_url: url ?? null }])
    }
    return { posthog_dashboard_embed_url: url }
  }
}

export default AnalyticsSettingsModuleService
