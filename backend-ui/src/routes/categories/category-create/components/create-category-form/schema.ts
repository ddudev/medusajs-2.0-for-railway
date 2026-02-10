import { z } from "zod"

export const CreateCategoryDetailsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  handle: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  visibility: z.enum(["public", "internal"]),
  // Extension (optional)
  original_name: z.string().optional(),
  external_id: z.string().nullable().optional(),
  extension_description: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_meta_description: z.string().nullable().optional(),
})

export type CreateCategorySchema = z.infer<typeof CreateCategorySchema>
export const CreateCategorySchema = z
  .object({
    rank: z.number().nullable(),
    parent_category_id: z.string().nullable(),
  })
  .merge(CreateCategoryDetailsSchema)
