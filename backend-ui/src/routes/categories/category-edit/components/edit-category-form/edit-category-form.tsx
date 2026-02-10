import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Input, Select, Textarea, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { HttpTypes } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import { HandleInput } from "../../../../../components/inputs/handle-input"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  useUpdateProductCategory,
  useUpdateProductCategoryExtension,
} from "../../../../../hooks/api/categories"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"

const EditCategorySchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  visibility: z.enum(["public", "internal"]),
  // Extension fields (optional)
  original_name: z.string().optional(),
  external_id: z.string().nullable().optional(),
  extension_description: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_meta_description: z.string().nullable().optional(),
})

type EditCategoryFormProps = {
  category: HttpTypes.AdminProductCategory
}

export const EditCategoryForm = ({ category }: EditCategoryFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const direction = useDocumentDirection()
  const ext = "category_extension" in category ? (category as { category_extension?: Record<string, unknown> }).category_extension : undefined
  const form = useForm<z.infer<typeof EditCategorySchema>>({
    defaultValues: {
      name: category.name,
      handle: category.handle,
      description: category.description || "",
      status: category.is_active ? "active" : "inactive",
      visibility: category.is_internal ? "internal" : "public",
      original_name: (ext as { original_name?: string } | undefined)?.original_name ?? "",
      external_id: (ext as { external_id?: string | null } | undefined)?.external_id ?? null,
      extension_description: (ext as { description?: string | null } | undefined)?.description ?? null,
      seo_title: (ext as { seo_title?: string | null } | undefined)?.seo_title ?? null,
      seo_meta_description: (ext as { seo_meta_description?: string | null } | undefined)?.seo_meta_description ?? null,
    },
    resolver: zodResolver(EditCategorySchema),
  })

  const { mutateAsync: updateCategory, isPending: isUpdatingCategory } =
    useUpdateProductCategory(category.id)
  const { mutateAsync: updateExtension, isPending: isUpdatingExtension } =
    useUpdateProductCategoryExtension(category.id)
  const isPending = isUpdatingCategory || isUpdatingExtension

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await updateCategory({
        name: data.name,
        description: data.description,
        handle: data.handle,
        is_active: data.status === "active",
        is_internal: data.visibility === "internal",
      })
      await updateExtension({
        original_name: data.original_name ?? "",
        external_id: data.external_id ?? null,
        description: data.extension_description ?? null,
        seo_title: data.seo_title ?? null,
        seo_meta_description: data.seo_meta_description ?? null,
      })
      toast.success(t("categories.edit.successToast"))
      handleSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    }
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-4">
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
                    <Form.Label
                      optional
                      tooltip={t("collections.handleTooltip")}
                    >
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
                      <Form.Label>
                        {t("categories.fields.status.label")}
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
            <div className="border-ui-border-base mt-4 border-t pt-4">
              <Heading level="h3" className="mb-3">
                {t("categories.fields.extension.title", "Extension")}
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
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
