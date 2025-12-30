import { useLoaderData, useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { usePromotion, usePromotionRules } from "../../../hooks/api/promotions"
import { useExtension } from "../../../providers/extension-provider"
import { CampaignSection } from "./components/campaign-section"
import { PromotionConditionsSection } from "./components/promotion-conditions-section"
import { PromotionGeneralSection } from "./components/promotion-general-section"
import { promotionLoader } from "./loader"

export const PromotionDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof promotionLoader>
  >

  const { id } = useParams()
  const { promotion, isLoading } = usePromotion(id!, { initialData })
  const query: Record<string, string> = {}

  if (promotion?.type === "buyget") {
    query.promotion_type = promotion.type
  }

  // Try to get rules from listRules API first
  const { rules: apiRules } = usePromotionRules(id!, "rules", query)
  const { rules: apiTargetRules } = usePromotionRules(id!, "target-rules", query)
  const { rules: apiBuyRules } = usePromotionRules(id!, "buy-rules", query)
  
  // Merge API rules with promotion rules to ensure all rules are displayed
  // The API might not return custom attributes like "subtotal", so we need to merge both sources
  const mergeRules = (apiRulesList: any[] | undefined, promotionRulesList: any[] | undefined) => {
    const apiRulesMap = new Map((apiRulesList || []).map((r: any) => [r.id, r]))
    const promotionRulesMap = new Map((promotionRulesList || []).map((r: any) => [r.id, r]))
    
    // Start with API rules (they have proper labels)
    const merged = [...(apiRulesList || [])]
    
    // Add promotion rules that aren't in API response (like subtotal)
    for (const [id, rule] of promotionRulesMap) {
      if (!apiRulesMap.has(id)) {
        // Transform promotion rule to match API format
        merged.push({
          id: rule.id,
          attribute: rule.attribute,
          operator: rule.operator,
          values: rule.values,
          attribute_label: rule.attribute === "subtotal" ? "Subtotal" 
            : rule.attribute === "item_total" ? "Item Total" 
            : rule.attribute?.split('.').pop() || rule.attribute,
          operator_label: rule.operator === "gte" ? "Greater than or equal to" 
            : rule.operator === "gt" ? "Greater than"
            : rule.operator === "lte" ? "Less than or equal to"
            : rule.operator === "lt" ? "Less than"
            : rule.operator === "eq" ? "Equal to"
            : rule.operator === "ne" ? "Not equal to"
            : rule.operator,
          field_type: rule.attribute === "subtotal" || rule.attribute === "item_total" ? "number" : "text",
        })
      }
    }
    
    return merged
  }
  
  const rules = mergeRules(apiRules, promotion?.rules)
  const targetRules = mergeRules(apiTargetRules, promotion?.application_method?.target_rules)
  const buyRules = mergeRules(apiBuyRules, promotion?.application_method?.buy_rules)
  
  // Debug: Log rules to see what we're getting
  if (process.env.NODE_ENV === "development") {
    console.log("Promotion rules:", { 
      apiRules, 
      promotionRules: promotion?.rules,
      finalRules: rules,
      targetRules, 
      buyRules 
    })
  }

  const { getWidgets } = useExtension()

  if (isLoading || !promotion) {
    return (
      <TwoColumnPageSkeleton mainSections={3} sidebarSections={1} showJSON />
    )
  }

  return (
    <TwoColumnPage
      data={promotion}
      widgets={{
        after: getWidgets("promotion.details.after"),
        before: getWidgets("promotion.details.before"),
        sideAfter: getWidgets("promotion.details.side.after"),
        sideBefore: getWidgets("promotion.details.side.before"),
      }}
      hasOutlet
      showJSON
    >
      <TwoColumnPage.Main>
        <PromotionGeneralSection promotion={promotion} />
        <PromotionConditionsSection 
          rules={rules || []} 
          ruleType={"rules"}
          applicationMethodTargetType={promotion.application_method?.target_type || "items"}
        />
        <PromotionConditionsSection
          rules={targetRules || []}
          ruleType={"target_rules"}
          applicationMethodTargetType={
            promotion.application_method?.target_type || "items"
          }
        />
        {promotion.type === "buyget" && (
          <PromotionConditionsSection
            rules={buyRules || []}
            ruleType={"buy_rules"}
            applicationMethodTargetType={"items"}
          />
        )}
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <CampaignSection campaign={promotion.campaign!} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}
