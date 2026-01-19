import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { deleteCustomersWithAuthWorkflow } from "../../../../workflows/delete-customer-with-auth"

/**
 * DELETE /admin/customers/:id
 * 
 * Override the default customer deletion to also delete auth identities
 * This prevents "email already exists" errors when creating a new customer with the same email
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.params.id

  console.log(`🗑️  Deleting customer ${customerId} with auth identity...`)

  try {
    const { result } = await deleteCustomersWithAuthWorkflow(req.scope).run({
      input: {
        ids: [customerId],
      },
    })

    console.log(`✅ Successfully deleted customer ${customerId} and auth identity`)

    res.status(200).json({
      id: customerId,
      object: "customer",
      deleted: true,
    })
  } catch (error) {
    console.error(`❌ Error deleting customer ${customerId}:`, error)
    
    res.status(500).json({
      message: error.message || "Failed to delete customer",
      error: error,
    })
  }
}
