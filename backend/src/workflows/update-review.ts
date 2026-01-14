import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateReviewsStep } from "./steps/update-review"

export type UpdateReviewInput = {
  id: string
  status: "pending" | "approved" | "rejected"
}[]

type UpdateReviewOutput = {
  reviews: any[]
}

export const updateReviewWorkflow = createWorkflow<
  UpdateReviewInput,
  UpdateReviewOutput,
  []
>("update-review", function (input) {
  const reviews = updateReviewsStep(input)

  return new WorkflowResponse({
    reviews
  })
})
