import { Module } from "@medusajs/framework/utils"
import AnalyticsSettingsModuleService from "./service"

export const ANALYTICS_SETTINGS_MODULE = "analyticsSettingsModule"

export default Module(ANALYTICS_SETTINGS_MODULE, {
  service: AnalyticsSettingsModuleService,
})
