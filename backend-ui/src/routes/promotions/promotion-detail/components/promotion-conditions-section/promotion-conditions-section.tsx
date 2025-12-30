import { PencilSquare } from "@medusajs/icons"
import { ApplicationMethodTargetTypeValues, HttpTypes, PromotionRuleTypes, } from "@medusajs/types"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { BadgeListSummary } from "../../../../../components/common/badge-list-summary"
import { NoRecords } from "../../../../../components/common/empty-table-content"

type RuleProps = {
  rule: HttpTypes.AdminPromotionRule
}

// Map custom attributes to their labels
const CUSTOM_ATTRIBUTE_LABELS: Record<string, string> = {
  subtotal: "Subtotal",
  item_total: "Item Total",
}

// Map operators to their labels
const OPERATOR_LABELS: Record<string, string> = {
  gte: "Greater than or equal to",
  gt: "Greater than",
  lte: "Less than or equal to",
  lt: "Less than",
  eq: "Equal to",
  ne: "Not equal to",
}

function RuleBlock({ rule }: RuleProps) {
  // Use custom labels if attribute_label is missing (for custom attributes like subtotal)
  const attributeLabel = rule.attribute_label || CUSTOM_ATTRIBUTE_LABELS[rule.attribute || ""] || rule.attribute || ""
  
  // Use custom labels if operator_label is missing
  const operatorLabel = rule.operator_label || OPERATOR_LABELS[rule.operator || ""] || rule.operator || ""
  
  // Handle values - for number fields, extract the value from the array if needed
  let displayValues: string[] = []
  if (rule.field_type === "number") {
    // For number fields, values might be an array of objects [{value: "40"}] or a single value
    if (Array.isArray(rule.values)) {
      if (typeof rule.values[0] === "object" && rule.values[0]?.value) {
        displayValues = [rule.values[0].value]
      } else {
        displayValues = [String(rule.values[0] || rule.values)]
      }
    } else {
      displayValues = [String(rule.values || "")]
    }
  } else {
    displayValues = rule.values?.map((v: any) => (typeof v === "object" ? v.label : String(v))) || []
  }

  return (
    <div className="bg-ui-bg-subtle shadow-borders-base align-center flex justify-around rounded-md p-2">
      <div className="text-ui-fg-subtle txt-compact-xsmall flex items-center whitespace-nowrap">
        <Badge
          size="2xsmall"
          key="rule-attribute"
          className="txt-compact-xsmall-plus tag-neutral-text mx-1 inline-block truncate"
        >
          {attributeLabel}
        </Badge>

        <span className="txt-compact-2xsmall mx-1 inline-block">
          {operatorLabel}
        </span>

        <BadgeListSummary
          inline
          className="!txt-compact-small-plus"
          list={displayValues}
        />
      </div>
    </div>
  )
}

type PromotionConditionsSectionProps = {
  rules: HttpTypes.AdminPromotionRule[]
  ruleType: PromotionRuleTypes
  applicationMethodTargetType: ApplicationMethodTargetTypeValues
}

export const PromotionConditionsSection = ({
  rules,
  ruleType,
  applicationMethodTargetType,
}: PromotionConditionsSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">
            {t(
              ruleType === "target-rules"
                ? `promotions.fields.conditions.${ruleType}.${applicationMethodTargetType}.title`
                : `promotions.fields.conditions.${ruleType}.title`
            )}
          </Heading>
        </div>

        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  to: `${ruleType}/edit`,
                },
              ],
            },
          ]}
        />
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-2 px-6 pb-4 pt-2">
        {!rules.length && (
          <NoRecords
            className="h-[180px]"
            title={t("general.noRecordsTitle")}
            message={t("promotions.conditions.list.noRecordsMessage")}
            action={{
              to: `${ruleType}/edit`,
              label: t("promotions.conditions.add"),
            }}
            buttonVariant="transparentIconLeft"
          />
        )}

        {rules.map((rule) => (
          <RuleBlock key={`${rule.id}-${rule.attribute}`} rule={rule} />
        ))}
      </div>
    </Container>
  )
}
