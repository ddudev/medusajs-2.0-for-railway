import { Modules } from '@medusajs/framework/utils'
import { IAuthModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

/**
 * Subscriber to clean up auth identities when a customer is deleted
 * This prevents "email already exists" errors when creating a new customer with the same email
 */
export default async function customerDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('🗑️  Customer deleted event triggered:', data.id)
  
  const authModuleService: IAuthModuleService = container.resolve(Modules.AUTH)
  
  try {
    // Find auth identities associated with this customer
    const identities = await authModuleService.listAuthIdentities({
      provider_identities: {
        entity_id: data.id,
      },
    })
    
    if (identities.length === 0) {
      console.log('⚠️  No auth identities found for customer:', data.id)
      return
    }
    
    console.log(`🔍 Found ${identities.length} auth identities for customer ${data.id}`)
    
    // Delete all auth identities for this customer
    for (const identity of identities) {
      try {
        await authModuleService.deleteAuthIdentities([identity.id])
        console.log(`✅ Deleted auth identity ${identity.id} for customer ${data.id}`)
      } catch (error) {
        console.error(`❌ Error deleting auth identity ${identity.id}:`, error)
      }
    }
    
    console.log(`✅ Successfully cleaned up auth identities for customer ${data.id}`)
  } catch (error) {
    console.error('❌ Error in customer deletion cleanup:', error)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
  }
}

export const config: SubscriberConfig = {
  event: 'customer.deleted'
}
