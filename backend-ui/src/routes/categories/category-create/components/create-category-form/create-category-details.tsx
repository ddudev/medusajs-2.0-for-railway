import { Heading, Input, Select, Separator, Text, Textarea } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../components/common/form"
import { HandleInput } from "../../../../../components/inputs/handle-input"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"
import { CreateCategorySchema } from "./schema"

type CreateCategoryDetailsProps = {
  form: UseFormReturn<CreateCategorySchema>
}

export const CreateCategoryDetails = ({ form }: CreateCategoryDetailsProps) => {
  const { t } = useTranslation()
  const direction = useDocumentDirection()
  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <div>
          <Heading>{t("categories.create.header")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("categories.create.hint")}
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("fields.title")}</Form.Label>
                  <Form.Control>
                    <Input autoComplete="off" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="handle"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label optional tooltip={t("collections.handleTooltip")}>
                    {t("fields.handle")}
                  </Form.Label>
                  <Form.Control>
                    <HandleInput {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>
        <Form.Field
          control={form.control}
          name="description"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>{t("fields.description")}</Form.Label>
                <Form.Control>
                  <Textarea {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="status"
            render={({ field: { ref, onChange, ...field } }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("categories.fields.status.label")}</Form.Label>
                  <Form.Control>
                    <Select
                      dir={direction}
                      {...field}
                      onValueChange={onChange}
                    >
                      <Select.Trigger ref={ref}>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="active">
                          {t("categories.fields.status.active")}
                        </Select.Item>
                        <Select.Item value="inactive">
                          {t("categories.fields.status.inactive")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="visibility"
            render={({ field: { ref, onChange, ...field } }) => {
              return (
                <Form.Item>
                  <Form.Label>
                    {t("categories.fields.visibility.label")}
                  </Form.Label>
                  <Form.Control>
                    <Select
                      dir={direction}
                      {...field}
                      onValueChange={onChange}
                    >
                      <Select.Trigger ref={ref}>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="public">
                          {t("categories.fields.visibility.public")}
                        </Select.Item>
                        <Select.Item value="internal">
                          {t("categories.fields.visibility.internal")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>
        <Separator className="my-4" />
        <Heading level="h3" className="mb-3">
          {t("categories.fields.extension.title", "Extension (optional)")}
        </Heading>
        <div className="flex flex-col gap-y-4">
          <Form.Field
            control={form.control}
            name="original_name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("categories.fields.extension.originalName", "Original name")}
                </Form.Label>
                <Form.Control>
                  <Input autoComplete="off" {...field} value={field.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="external_id"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("categories.fields.extension.externalId", "External ID")}
                </Form.Label>
                <Form.Control>
                  <Input
                    autoComplete="off"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="extension_description"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("categories.fields.extension.description", "Extension description")}
                </Form.Label>
                <Form.Control>
                  <Textarea {...field} value={field.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="seo_title"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("categories.fields.extension.seoTitle", "SEO title")}
                </Form.Label>
                <Form.Control>
                  <Input autoComplete="off" {...field} value={field.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="seo_meta_description"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("categories.fields.extension.seoMetaDescription", "SEO meta description")}
                </Form.Label>
                <Form.Control>
                  <Textarea {...field} value={field.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>
      </div>
    </div>
  )
}
