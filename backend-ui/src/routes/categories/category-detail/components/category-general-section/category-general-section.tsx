import { GlobeEurope, PencilSquare, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { useDeleteProductCategoryAction } from "../../../common/hooks/use-delete-product-category-action"
import { getIsActiveProps, getIsInternalProps } from "../../../common/utils"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"

type CategoryGeneralSectionProps = {
  category: HttpTypes.AdminProductCategory
}

export const CategoryGeneralSection = ({
  category,
}: CategoryGeneralSectionProps) => {
  const { t } = useTranslation()
  const isTranslationsEnabled = useFeatureFlag("translation")

  const activeProps = getIsActiveProps(category.is_active, t)
  const internalProps = getIsInternalProps(category.is_internal, t)

  const handleDelete = useDeleteProductCategoryAction(category)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{category.name}</Heading>
        <div className="flex items-center gap-x-4">
          <div className="flex items-center gap-x-2">
            <StatusBadge color={activeProps.color}>
              {activeProps.label}
            </StatusBadge>
            <StatusBadge color={internalProps.color}>
              {internalProps.label}
            </StatusBadge>
          </div>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.edit"),
                    icon: <PencilSquare />,
                    to: "edit",
                  },
                ],
              },
              ...(isTranslationsEnabled
                ? [
                    {
                      actions: [
                        {
                          label: t("translations.actions.manage"),
                          to: `/settings/translations/edit?reference=product_category&reference_id=${category.id}`,
                          icon: <GlobeEurope />,
                        },
                      ],
                    },
                  ]
                : []),
              {
                actions: [
                  {
                    label: t("actions.delete"),
                    icon: <Trash />,
                    onClick: handleDelete,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 gap-3 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.description")}
        </Text>
        <Text size="small" leading="compact">
          {category.description || "-"}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 gap-3 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.handle")}
        </Text>
        <Text size="small" leading="compact">
          /{category.handle}
        </Text>
      </div>
      {"category_extension" in category && category.category_extension && (
        <div className="border-ui-border-base px-6 py-4">
          <Heading level="h3" className="mb-3">
            {t("categories.fields.extension.title", "Extension")}
          </Heading>
          <div className="text-ui-fg-subtle grid grid-cols-2 gap-3">
            {"original_name" in category.category_extension && (
              <>
                <Text size="small" leading="compact" weight="plus">
                  {t("categories.fields.extension.originalName", "Original name")}
                </Text>
                <Text size="small" leading="compact">
                  {(category.category_extension as { original_name?: string }).original_name ?? "-"}
                </Text>
              </>
            )}
            {"external_id" in category.category_extension && (
              <>
                <Text size="small" leading="compact" weight="plus">
                  {t("categories.fields.extension.externalId", "External ID")}
                </Text>
                <Text size="small" leading="compact">
                  {(category.category_extension as { external_id?: string | null }).external_id ?? "-"}
                </Text>
              </>
            )}
            {"seo_title" in category.category_extension && (
              <>
                <Text size="small" leading="compact" weight="plus">
                  {t("categories.fields.extension.seoTitle", "SEO title")}
                </Text>
                <Text size="small" leading="compact">
                  {(category.category_extension as { seo_title?: string | null }).seo_title ?? "-"}
                </Text>
              </>
            )}
            {"seo_meta_description" in category.category_extension && (
              <>
                <Text size="small" leading="compact" weight="plus">
                  {t("categories.fields.extension.seoMetaDescription", "SEO meta description")}
                </Text>
                <Text size="small" leading="compact" className="line-clamp-2">
                  {(category.category_extension as { seo_meta_description?: string | null }).seo_meta_description ?? "-"}
                </Text>
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  )
}
