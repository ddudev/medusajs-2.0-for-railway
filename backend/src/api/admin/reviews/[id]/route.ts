import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"

/**
 * DELETE /admin/reviews/:id
 * Soft-deletes a single review.
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest<{ id: string }>,
  res: MedusaResponse
) => {
  const id = req.params.id
  const reviewModuleService: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  await reviewModuleService.deleteReviews([id])

  res.status(200).json({
    id,
    object: "review",
    deleted: true,
  })
}
