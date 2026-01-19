import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { deleteCustomersWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { IAuthModuleService } from "@medusajs/framework/types"

/**
 * Step to retrieve auth identities for customers before deletion
 */
const getCustomerAuthIdentitiesStep = createStep(
  "get-customer-auth-identities",
  async ({ customerIds }: { customerIds: string[] }, { container }) => {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const authModuleService = container.resolve(Modules.AUTH)

    const authIdentities: string[] = []

    // Get all customers with their email
    const customers = await customerModuleService.listCustomers({
      id: customerIds,
    })

    // Find auth identities for each customer email
    for (const customer of customers) {
      if (customer.email) {
        try {
          const identities = await authModuleService.listAuthIdentities({
            provider_identities: {
              entity_id: customer.id,
            },
          })

          authIdentities.push(...identities.map((identity) => identity.id))
        } catch (error) {
          console.warn(
            `Could not find auth identity for customer ${customer.id}:`,
            error
          )
        }
      }
    }

    return new StepResponse({ authIdentities }, { authIdentities })
  },
  async ({ authIdentities }, { container }) => {
    // No compensation needed - if customer deletion fails, we want to keep the auth identity
    console.log("Compensating: Auth identities not restored")
  }
)

/**
 * Step to delete auth identities
 */
const deleteAuthIdentitiesStep = createStep(
  "delete-auth-identities",
  async ({ ids }: { ids: string[] }, { container }) => {
    if (!ids || ids.length === 0) {
      return new StepResponse({ deleted: [] })
    }

    const authModuleService: IAuthModuleService = container.resolve(Modules.AUTH)

    try {
      await authModuleService.deleteAuthIdentities(ids)
      console.log(`✅ Deleted ${ids.length} auth identities`)
      return new StepResponse({ deleted: ids })
    } catch (error) {
      console.error("❌ Error deleting auth identities:", error)
      throw error
    }
  },
  async ({ deleted }, { container }) => {
    // No compensation - if workflow fails, we don't want to restore deleted auth identities
    console.log("Compensating: Auth identities not restored")
  }
)

/**
 * Custom workflow to delete customers AND their auth identities
 * This prevents the "email already exists" error when creating a new customer with the same email
 */
export const deleteCustomersWithAuthWorkflow = createWorkflow(
  "delete-customers-with-auth",
  (input: { ids: string[] }) => {
    // First, get the auth identities for these customers
    const { authIdentities } = getCustomerAuthIdentitiesStep({
      customerIds: input.ids,
    })

    // Delete the customers (this is the standard MedusaJS workflow)
    deleteCustomersWorkflow.runAsStep({
      input: {
        ids: input.ids,
      },
    })

    // Then delete their auth identities
    const authIdentityIds = transform({ authIdentities }, (data) => {
      if (data.authIdentities && data.authIdentities.length > 0) {
        return data.authIdentities
      }
      return []
    })

    deleteAuthIdentitiesStep({ ids: authIdentityIds })

    return new WorkflowResponse({
      deleted: input.ids,
    })
  }
)
