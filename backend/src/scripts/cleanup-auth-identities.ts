import { Modules } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework/types'

/**
 * Script to clean up orphaned auth identities
 * Run this once to fix existing data where customers were deleted but auth identities remain
 * 
 * Usage:
 * npx medusa exec ./src/scripts/cleanup-auth-identities.ts
 */
export default async function cleanupOrphanedAuthIdentities(
  container: MedusaContainer
) {
  console.log('🧹 Starting auth identity cleanup...')
  
  const authModuleService = container.resolve(Modules.AUTH)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  
  try {
    // Get all auth identities
    const allIdentities = await authModuleService.listAuthIdentities({})
    console.log(`📊 Found ${allIdentities.length} total auth identities`)
    
    let orphanedCount = 0
    let deletedCount = 0
    
    // Check each identity
    for (const identity of allIdentities) {
      // Get the customer ID from provider identities
      const customerProvider = identity.provider_identities?.find(
        (pi: any) => pi.provider === 'emailpass'
      )
      
      if (!customerProvider || !customerProvider.entity_id) {
        console.log(`⚠️  Auth identity ${identity.id} has no customer reference`)
        continue
      }
      
      const customerId = customerProvider.entity_id
      
      // Check if customer exists
      try {
        await customerModuleService.retrieveCustomer(customerId)
        // Customer exists, skip
      } catch (error) {
        // Customer doesn't exist - this is an orphaned auth identity
        orphanedCount++
        console.log(
          `🗑️  Found orphaned auth identity ${identity.id} for deleted customer ${customerId} (email: ${customerProvider.user_metadata?.email || 'unknown'})`
        )
        
        try {
          await authModuleService.deleteAuthIdentities([identity.id])
          deletedCount++
          console.log(`✅ Deleted orphaned auth identity ${identity.id}`)
        } catch (deleteError) {
          console.error(
            `❌ Failed to delete auth identity ${identity.id}:`,
            deleteError
          )
        }
      }
    }
    
    console.log('\n📊 Cleanup Summary:')
    console.log(`   Total auth identities checked: ${allIdentities.length}`)
    console.log(`   Orphaned identities found: ${orphanedCount}`)
    console.log(`   Successfully deleted: ${deletedCount}`)
    console.log('✨ Cleanup complete!')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}
