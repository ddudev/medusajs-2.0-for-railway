import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { IProductModuleService } from '@medusajs/framework/types'
import { INNPRO_XML_IMPORTER_MODULE } from '../modules/innpro-xml-importer'
import InnProXmlImporterService from '../modules/innpro-xml-importer/service'
import { PriceUpdateData } from '../modules/innpro-xml-importer/types'

type PriceUpdateWorkflowInput = {
  priceXmlUrl: string
  updateInventory?: boolean
}

type PriceUpdateWorkflowOutput = {
  totalProducts: number
  updatedProducts: number
  failedProducts: number
  status: 'completed' | 'completed_with_errors' | 'failed'
}

/**
 * Step: Download and parse price XML
 */
const fetchAndParsePriceXmlStep = createStep(
  'fetch-parse-price-xml',
  async (input: { priceXmlUrl: string }, { container }: { container: MedusaContainer }) => {
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )

    const xmlData = await importerService.downloadAndParseXml(input.priceXmlUrl)
    return new StepResponse(xmlData)
  }
)

/**
 * Step: Extract price data from XML
 */
const extractPriceDataStep = createStep(
  'extract-price-data',
  async (input: { priceXmlData: any }, { container }: { container: MedusaContainer }) => {
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const priceDataMap = importerService.extractPriceData(input.priceXmlData)
    logger.info(`Extracted price data for ${priceDataMap.size} products`)

    // Convert Map to plain object for workflow serialization
    const priceDataObject: Record<string, PriceUpdateData> = {}
    for (const [key, value] of priceDataMap.entries()) {
      priceDataObject[key] = value
    }

    return new StepResponse(priceDataObject)
  }
)

/**
 * Helper function to update inventory for a variant
 */
async function updateVariantInventory(
  variant: any,
  stockQuantity: number,
  locationId: string,
  inventoryService: any,
  productService: any,
  productId: string,
  container: any,
  logger: any
): Promise<void> {
  try {
    // Get inventory items for this variant - fetch them if not already loaded
    let inventoryItems = variant.inventory_items || []
    
    // If inventory_items are not loaded, try to fetch the variant with relations
    if (inventoryItems.length === 0 && variant.manage_inventory) {
      try {
        const variantsResult = await productService.listProductVariants({
          id: [variant.id]
        })
        
        // Handle different return structures
        const variants = (variantsResult as any)?.variants || 
                        (variantsResult as any)?.data || 
                        (Array.isArray(variantsResult) ? variantsResult : [])
        
        if (variants && variants.length > 0) {
          const variantWithInventory = variants[0]
          inventoryItems = variantWithInventory?.inventory_items || []
        }
      } catch (fetchError) {
        logger.debug(`Could not fetch inventory items for variant ${variant.id}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }
    }

    // If no inventory items exist but manage_inventory is enabled, create and link one
    if (inventoryItems.length === 0) {
      if (!variant.manage_inventory) {
        logger.debug(`Variant ${variant.id} has inventory management disabled`)
        return
      }
      
      // Try to find existing inventory item first, or create if it doesn't exist
      const variantSku = variant.sku || `variant_${variant.id}`
      logger.info(`Looking for inventory item for variant ${variant.id} (SKU: ${variantSku})`)
      
      let inventoryItemId: string | null = null
      
      try {
        // First, try to find existing inventory item by SKU
        const existingItemsResult = await inventoryService.listInventoryItems({
          sku: variantSku
        })
        
        // Handle different return structures
        const existingItems = (existingItemsResult as any)?.inventory_items || 
                            (existingItemsResult as any)?.data || 
                            (Array.isArray(existingItemsResult) ? existingItemsResult : [])
        
        if (existingItems && existingItems.length > 0) {
          inventoryItemId = existingItems[0].id
          logger.info(`✅ Found existing inventory item ${inventoryItemId} for variant ${variant.id} (SKU: ${variantSku})`)
        } else {
          // Create new inventory item if it doesn't exist
          logger.info(`Creating new inventory item for variant ${variant.id} (SKU: ${variantSku})`)
          try {
            const newItem = await inventoryService.createInventoryItems([{
              sku: variantSku,
              requires_shipping: true,
            }])
            
            // Handle different return structures
            const createdItems = (newItem as any)?.inventory_items || 
                              (newItem as any)?.data || 
                              (Array.isArray(newItem) ? newItem : [])
            
            if (createdItems && createdItems.length > 0) {
              inventoryItemId = createdItems[0].id
              logger.info(`✅ Created inventory item ${inventoryItemId} for variant ${variant.id}`)
            }
          } catch (createError: any) {
            // If creation fails because item already exists, try to find it again
            const errorMessage = createError instanceof Error ? createError.message : String(createError)
            if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
              logger.debug(`Inventory item creation failed (already exists), searching again...`)
              
              // Retry finding the item
              const retryItemsResult = await inventoryService.listInventoryItems({
                sku: variantSku
              })
              const retryItems = (retryItemsResult as any)?.inventory_items || 
                               (retryItemsResult as any)?.data || 
                               (Array.isArray(retryItemsResult) ? retryItemsResult : [])
              
              if (retryItems && retryItems.length > 0) {
                inventoryItemId = retryItems[0].id
                logger.info(`✅ Found existing inventory item ${inventoryItemId} after creation attempt`)
              } else {
                logger.error(`Failed to find or create inventory item for variant ${variant.id}: ${errorMessage}`)
                throw createError
              }
            } else {
              logger.error(`Failed to create inventory item for variant ${variant.id}: ${errorMessage}`)
              throw createError
            }
          }
        }
        
        // Now link the inventory item to the variant if not already linked
        if (inventoryItemId) {
          try {
            const link = container.resolve(ContainerRegistrationKeys.LINK)
            const { Modules } = await import("@medusajs/framework/utils")
            
            // Check if link already exists by trying to list links
            // If link doesn't exist, create it
            try {
              await link.create([
                {
                  [Modules.PRODUCT]: { variant_id: variant.id },
                  [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
                  data: { required_quantity: 1 },
                },
              ])
              logger.info(`✅ Linked inventory item ${inventoryItemId} to variant ${variant.id}`)
            } catch (linkError: any) {
              // If link already exists, that's fine - just log it
              const linkErrorMessage = linkError instanceof Error ? linkError.message : String(linkError)
              if (linkErrorMessage.includes('already exists') || linkErrorMessage.includes('duplicate') || linkErrorMessage.includes('unique constraint')) {
                logger.debug(`Inventory item ${inventoryItemId} already linked to variant ${variant.id}`)
              } else {
                logger.warn(`Failed to link inventory item (may already be linked): ${linkErrorMessage}`)
              }
            }
            
            // Now we have the inventory item linked, proceed with updating levels
            inventoryItems = [{
              inventory_item_id: inventoryItemId,
              id: inventoryItemId,
            }]
          } catch (linkError) {
            logger.error(`Failed to link inventory item to variant: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`)
            throw linkError
          }
        } else {
          logger.error(`No inventory item ID found for variant ${variant.id}`)
          return
        }
      } catch (error) {
        logger.error(`Failed to find or create inventory item for variant ${variant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        throw error
      }
    }

    // Update each inventory item (usually just one per variant)
    for (const inventoryItemLink of inventoryItems) {
      const inventoryItemId = inventoryItemLink.inventory_item_id || inventoryItemLink.inventory?.id || inventoryItemLink.id

      if (!inventoryItemId) {
        logger.warn(`Variant ${variant.id} has inventory item link but no inventory_item_id`)
        continue
      }

      try {
        // Get current inventory levels for this item
        const levelsResult = await inventoryService.listInventoryLevels({
          inventory_item_id: [inventoryItemId],
          location_id: [locationId]
        })

        // Handle different return structures
        const levels = (levelsResult as any)?.inventory_levels || 
                      (levelsResult as any)?.data || 
                      (Array.isArray(levelsResult) ? levelsResult : [])

        if (levels && levels.length > 0) {
          // Update existing level
          const level = levels[0]
          const previousQuantity = level.stocked_quantity || 0
          
          await inventoryService.updateInventoryLevels([{
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: stockQuantity
          }])
          
          // Verify the update by fetching again
          await new Promise(resolve => setTimeout(resolve, 100))
          
          try {
            const verifyLevelsResult = await inventoryService.listInventoryLevels({
              inventory_item_id: [inventoryItemId],
              location_id: [locationId]
            })
            const verifyLevels = (verifyLevelsResult as any)?.inventory_levels || 
                               (verifyLevelsResult as any)?.data || 
                               (Array.isArray(verifyLevelsResult) ? verifyLevelsResult : [])
            
            if (verifyLevels && verifyLevels.length > 0) {
              const updatedQuantity = verifyLevels[0].stocked_quantity || 0
              if (Math.abs(updatedQuantity - stockQuantity) < 1) {
                logger.info(`✅ Updated inventory for variant ${variant.id}: ${previousQuantity} → ${stockQuantity}`)
              } else {
                logger.warn(`⚠️ Inventory update may have failed for variant ${variant.id}: expected ${stockQuantity}, got ${updatedQuantity}`)
              }
            } else {
              logger.warn(`⚠️ Could not verify inventory update for variant ${variant.id} - level not found after update`)
            }
          } catch (verifyError) {
            logger.warn(`Could not verify inventory update: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`)
            logger.info(`✅ Updated inventory for variant ${variant.id} (item ${inventoryItemId}): ${previousQuantity} → ${stockQuantity} (verification skipped)`)
          }
        } else {
          // Create new level
          await inventoryService.createInventoryLevels([{
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: stockQuantity
          }])
          
          // Verify the creation
          await new Promise(resolve => setTimeout(resolve, 100))
          
          try {
            const verifyLevelsResult = await inventoryService.listInventoryLevels({
              inventory_item_id: [inventoryItemId],
              location_id: [locationId]
            })
            const verifyLevels = (verifyLevelsResult as any)?.inventory_levels || 
                               (verifyLevelsResult as any)?.data || 
                               (Array.isArray(verifyLevelsResult) ? verifyLevelsResult : [])
            
            if (verifyLevels && verifyLevels.length > 0) {
              const createdQuantity = verifyLevels[0].stocked_quantity || 0
              if (Math.abs(createdQuantity - stockQuantity) < 1) {
                logger.info(`✅ Created inventory level for variant ${variant.id}: ${stockQuantity}`)
              } else {
                logger.warn(`⚠️ Inventory level creation may have failed for variant ${variant.id}: expected ${stockQuantity}, got ${createdQuantity}`)
              }
            } else {
              logger.warn(`⚠️ Could not verify inventory level creation for variant ${variant.id} - level not found after creation`)
            }
          } catch (verifyError) {
            logger.warn(`Could not verify inventory level creation: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`)
            logger.info(`✅ Created inventory level for variant ${variant.id} (item ${inventoryItemId}): ${stockQuantity} (verification skipped)`)
          }
        }
      } catch (error) {
        logger.error(`Failed to update inventory for item ${inventoryItemId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        throw error
      }
    }
  } catch (error) {
    logger.error(`Failed to update variant ${variant.id} inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

/**
 * Step: Update product prices and inventory
 */
const updateProductsStep = createStep(
  'update-products-prices',
  async (
    input: {
      priceDataMap: Record<string, PriceUpdateData> | Map<string, PriceUpdateData>
      updateInventory: boolean
    },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
    const storeModuleService = container.resolve(Modules.STORE)
    const inventoryService = container.resolve(Modules.INVENTORY)
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION)

    // Get default currency from store
    const [store] = await storeModuleService.listStores()
    const defaultCurrency = store?.supported_currencies?.find(
      (c: any) => c.is_default
    )?.currency_code || 'eur'

    // Get default stock location for inventory updates
    let defaultLocation: any = null
    if (input.updateInventory) {
      try {
        const locations = await stockLocationService.listStockLocations({})
        defaultLocation = Array.isArray(locations) && locations.length > 0 ? locations[0] : null
        if (defaultLocation) {
          logger.info(`Using default stock location: ${defaultLocation.name} (${defaultLocation.id})`)
        } else {
          logger.warn('No stock location found - inventory updates will be skipped')
        }
      } catch (error) {
        logger.error(`Failed to fetch stock location: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    let updatedCount = 0
    let failedCount = 0
    let inventoryUpdatedCount = 0
    let inventoryFailedCount = 0

    // Convert priceDataMap to Map if it's a plain object (from workflow serialization)
    const priceDataMap = input.priceDataMap instanceof Map 
      ? input.priceDataMap 
      : new Map(Object.entries(input.priceDataMap as Record<string, PriceUpdateData>))
    
    const totalProducts = priceDataMap.size

    // Extract all external_ids from the price data
    const externalIds = Array.from(priceDataMap.keys())
    
    logger.info(`Querying products by external_id for ${externalIds.length} products from ${totalProducts} price records`)

    // Query products directly by external_id instead of fetching all products
    const productsResult = await productService.listProducts({
      external_id: externalIds
    })

    // Handle different return structures: array, { products }, or { data }
    const existingProducts = (productsResult as any)?.products || 
                            (productsResult as any)?.data || 
                            (Array.isArray(productsResult) ? productsResult : [])

    // Create a map of external_id to products
    const productsByExternalId = new Map<string, any>()

    for (const product of existingProducts) {
      // external_id is stored at the top level of the product
      const externalId = (product as any).external_id

      if (externalId) {
        productsByExternalId.set(String(externalId), product)
      }
    }

    logger.info(`Found ${productsByExternalId.size} products in database matching ${externalIds.length} external_ids from XML`)

    // Process products in batches to follow best practices
    const BATCH_SIZE = 50
    const productEntries = Array.from(priceDataMap.entries())
    let processedCount = 0
    const totalBatches = Math.ceil(productEntries.length / BATCH_SIZE)

    // Process in batches
    for (let batchIndex = 0; batchIndex < productEntries.length; batchIndex += BATCH_SIZE) {
      const batch = productEntries.slice(batchIndex, batchIndex + BATCH_SIZE)
      const currentBatchNumber = Math.floor(batchIndex / BATCH_SIZE) + 1
      logger.info(`Processing batch ${currentBatchNumber} of ${totalBatches} (${batch.length} products)`)

      for (const [productId, priceData] of batch) {
      try {
        const product = productsByExternalId.get(productId)

        if (!product) {
          continue
        }

        // Get variants for this product (avoid retrieveProduct with relations due to MedusaJS bug #13891)
        const variantsResult = await productService.listProductVariants({
          product_id: [product.id]
        })

        // Handle different return structures: array, { variants }, or { data }
        const variants = (variantsResult as any)?.variants || 
                        (variantsResult as any)?.data || 
                        (Array.isArray(variantsResult) ? variantsResult : [])

        if (!variants || variants.length === 0) {
          logger.warn(`Product ${product.id} has no variants, skipping`)
          continue
        }

        const fullProduct = {
          ...product,
          variants: variants
        }

        // Update customer price to SRP (if available), otherwise use cost price
        // Prices from XML are in decimal format (e.g., 12.65), MedusaJS expects decimal prices
        // Apply 20% VAT for Bulgaria (multiply by 1.2)
        const basePrice = priceData.srpNet || priceData.srpGross || priceData.priceNet || priceData.priceGross || 0
        const customerPrice = basePrice > 0 ? basePrice * 1.2 : 0

        if (customerPrice > 0) {
          try {
            
            // Prepare variant prices - ensure all variants have valid IDs
            const validVariants = fullProduct.variants.filter((v: any) => v && v.id)
            if (validVariants.length === 0) {
              logger.warn(`No valid variants found for product ${product.id}, skipping price update`)
            } else {
              try {
                const { updateProductVariantsWorkflow } = await import("@medusajs/medusa/core-flows")
                const updateVariantsWorkflow = updateProductVariantsWorkflow(container)

                // Update variants with prices - this creates prices if they don't exist
                // Price includes 20% VAT
                const variantUpdates = validVariants.map((variant: any) => ({
                  id: variant.id,
                  prices: [{
                    currency_code: defaultCurrency,
                    amount: customerPrice,
                  }],
                }))

                await updateVariantsWorkflow.run({
                  input: {
                    product_variants: variantUpdates,
                  },
                })
                
                // Wait a moment for prices to be committed
                await new Promise(resolve => setTimeout(resolve, 200))
                
                // Verify prices were actually created
                try {
                  const verifyVariants = await productService.listProductVariants({
                    id: validVariants.map((v: any) => v.id)
                  })
                  const verifyList = (verifyVariants as any)?.variants || 
                                   (verifyVariants as any)?.data || 
                                   (Array.isArray(verifyVariants) ? verifyVariants : [])
                  
                  let verifiedCount = 0
                  for (const verifyVariant of verifyList) {
                    const prices = verifyVariant.prices || []
                    const hasPrice = prices.some((p: any) => 
                      p.currency_code === defaultCurrency && 
                      Math.abs(parseFloat(p.amount) - customerPrice) < 0.01
                    )
                    if (hasPrice) {
                      verifiedCount++
                    } else {
                      logger.warn(`⚠️ Price not found for variant ${verifyVariant.id} after update`)
                    }
                  }
                  
                  if (verifiedCount !== verifyList.length) {
                    logger.warn(`⚠️ Price update partially verified for product ${product.id}: ${verifiedCount}/${verifyList.length} variants have prices`)
                  }
                } catch (verifyError) {
                  logger.warn(`Could not verify prices: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`)
                }
              } catch (priceError: any) {
                const errorMessage = priceError instanceof Error ? priceError.message : String(priceError)
                logger.error(`Failed to update prices for product ${product.id} (external_id: ${productId}): ${errorMessage}`)
              }
            }
          } catch (priceError: any) {
            const errorMessage = priceError instanceof Error ? priceError.message : String(priceError)
            logger.error(`Failed to update prices for product ${product.id} (external_id: ${productId}): ${errorMessage}`)
            // Don't throw - allow other operations to proceed
          }
        }

        // Store cost price in variant metadata for revenue tracking
        if (priceData.priceNet !== undefined || priceData.priceGross !== undefined) {
          try {
            const costPrice = priceData.priceNet || priceData.priceGross
            
            // Use updateProductVariantsWorkflow for metadata updates
            const { updateProductVariantsWorkflow } = await import("@medusajs/medusa/core-flows")
            const updateVariantsWorkflow = updateProductVariantsWorkflow(container)

            // Update variant metadata with cost price
            const variantUpdates = fullProduct.variants.map((variant: any) => ({
              id: variant.id,
              metadata: {
                ...(variant.metadata || {}),
                cost_price: costPrice,
                cost_price_net: priceData.priceNet,
                cost_price_gross: priceData.priceGross,
                srp_net: priceData.srpNet,
                srp_gross: priceData.srpGross,
              },
            }))

            await updateVariantsWorkflow.run({
              input: {
                product_variants: variantUpdates,
              },
            })

            logger.debug(`Updated cost price metadata for product ${product.id}: ${costPrice} ${defaultCurrency}`)
          } catch (metadataError) {
            logger.warn(`Failed to update metadata for product ${product.id}: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`)
            // Don't throw - metadata update failure shouldn't block the price update
          }
        }

        // Update inventory if enabled
        if (input.updateInventory && defaultLocation) {
          try {
            // First, enable manage_inventory for all variants if it's disabled
            const variantsNeedingInventory = fullProduct.variants.filter((v: any) => !v.manage_inventory)
            
            if (variantsNeedingInventory.length > 0) {
              logger.info(`Enabling inventory management for ${variantsNeedingInventory.length} variants of product ${product.id}`)
              try {
                const { updateProductVariantsWorkflow } = await import("@medusajs/medusa/core-flows")
                const updateVariantsWorkflow = updateProductVariantsWorkflow(container)

                // Enable manage_inventory first - this should trigger MedusaJS to create inventory items
                const inventoryEnableUpdates = variantsNeedingInventory.map((variant: any) => ({
                  id: variant.id,
                  manage_inventory: true,
                }))

                await updateVariantsWorkflow.run({
                  input: {
                    product_variants: inventoryEnableUpdates,
                  },
                })
                logger.info(`✅ Enabled inventory management for ${inventoryEnableUpdates.length} variants`)
                
                // Wait a moment for MedusaJS to create inventory items
                await new Promise(resolve => setTimeout(resolve, 500))
                
                // Create inventory items for variants that don't have them
                for (const variant of variantsNeedingInventory) {
                  try {
                    // Check if inventory item already exists for this variant
                    const existingItems = await inventoryService.listInventoryItems({
                      sku: variant.sku || `variant_${variant.id}`
                    })
                    
                    // Handle different return structures
                    const items = (existingItems as any)?.inventory_items || 
                                 (existingItems as any)?.data || 
                                 (Array.isArray(existingItems) ? existingItems : [])
                    
                    if (items && items.length === 0) {
                      // Create new inventory item
                      const newItem = await inventoryService.createInventoryItems([{
                        sku: variant.sku || `variant_${variant.id}`,
                        requires_shipping: true,
                      }])
                      
                      // Handle different return structures
                      const createdItems = (newItem as any)?.inventory_items || 
                                          (newItem as any)?.data || 
                                          (Array.isArray(newItem) ? newItem : [])
                      
                      if (createdItems && createdItems.length > 0) {
                        const inventoryItemId = createdItems[0].id
                        logger.info(`✅ Created inventory item ${inventoryItemId} for variant ${variant.id}`)
                        
                        // Link inventory item to variant using the link module
                        try {
                          const link = container.resolve(ContainerRegistrationKeys.LINK)
                          const { Modules } = await import("@medusajs/framework/utils")
                          
                          // Create link between variant and inventory item
                          await link.create([
                            {
                              [Modules.PRODUCT]: { variant_id: variant.id },
                              [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
                              data: { required_quantity: 1 },
                            },
                          ])
                          logger.info(`✅ Linked inventory item ${inventoryItemId} to variant ${variant.id}`)
                        } catch (linkError) {
                          logger.warn(`Failed to link inventory item: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`)
                        }
                      }
                    } else {
                      logger.debug(`Inventory item already exists for variant ${variant.id}`)
                    }
                  } catch (itemError) {
                    logger.warn(`Failed to create inventory item for variant ${variant.id}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`)
                  }
                }
              } catch (enableError) {
                logger.warn(`Failed to enable inventory management: ${enableError instanceof Error ? enableError.message : 'Unknown error'}`)
              }
            }

            // Get variants with inventory items (now that inventory is enabled)
            const variantsResult = await productService.listProductVariants({
              product_id: [product.id]
            })

            // Handle different return structures
            const variantsWithInventory = (variantsResult as any)?.variants || 
                                        (variantsResult as any)?.data || 
                                        (Array.isArray(variantsResult) ? variantsResult : [])

            if (!variantsWithInventory || variantsWithInventory.length === 0) {
            } else {
              // If we have multiple variants with specific stock quantities, update each individually
              if (priceData.variants && priceData.variants.length > 0) {
                for (const variant of variantsWithInventory) {
                  // Match variant by barcode (code_external)
                  const stockData = priceData.variants.find(v => v.codeExternal === variant.barcode)

                  if (stockData) {
                    await updateVariantInventory(
                      variant,
                      stockData.stockQuantity,
                      defaultLocation.id,
                      inventoryService,
                      productService,
                      product.id,
                      container,
                      logger
                    )
                    inventoryUpdatedCount++
                  } else {
                  }
                }
              } else if (priceData.stockQuantity !== undefined) {
                // Fallback: Update all variants to the same stock quantity (single-size products)
                for (const variant of variantsWithInventory) {
                  await updateVariantInventory(
                    variant,
                    priceData.stockQuantity,
                    defaultLocation.id,
                    inventoryService,
                    productService,
                    product.id,
                    container,
                    logger
                  )
                  inventoryUpdatedCount++
                }
              }
            }
          } catch (error) {
            logger.error(`Failed to update inventory for product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            inventoryFailedCount++
          }
        }

        updatedCount++
        processedCount++
        
        // Yield to event loop every 10 products to prevent blocking
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve))
        }
      } catch (error) {
        logger.error(`Failed to update product with external_id ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        failedCount++
        processedCount++
      }
      }
      
      // Yield to event loop between batches
      if (batchIndex + BATCH_SIZE < productEntries.length) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }

    logger.info(`Price update completed: ${updatedCount} updated, ${failedCount} failed`)
    if (input.updateInventory) {
      logger.info(`Inventory update completed: ${inventoryUpdatedCount} variants updated, ${inventoryFailedCount} failed`)
    }

    return new StepResponse({
      updated: updatedCount,
      failed: failedCount,
      total: totalProducts,
      inventoryUpdated: inventoryUpdatedCount,
      inventoryFailed: inventoryFailedCount,
    })
  }
)

/**
 * Step: Calculate final status
 */
const calculateFinalStatusStep = createStep(
  'calculate-final-status',
  async (input: {
    total: number
    updated: number
    failed: number
  }) => {
    const status: 'completed' | 'completed_with_errors' | 'failed' =
      input.failed > 0
        ? (input.updated > 0 ? 'completed_with_errors' : 'failed')
        : 'completed'

    return new StepResponse({
      totalProducts: input.total,
      updatedProducts: input.updated,
      failedProducts: input.failed,
      status,
    })
  }
)

/**
 * Main Price Update Workflow
 */
export const innproPriceUpdateWorkflow = createWorkflow<
  PriceUpdateWorkflowInput,
  PriceUpdateWorkflowOutput,
  []
>('innpro-price-update', function (input) {
  const { priceXmlUrl, updateInventory = false } = input

  // Step 1: Download and parse price XML
  const priceXmlData = fetchAndParsePriceXmlStep({ priceXmlUrl })

  // Step 2: Extract price data
  const priceDataMap = extractPriceDataStep({ priceXmlData })

  // Step 3: Update products
  const updateResult = updateProductsStep({
    priceDataMap,
    updateInventory,
  })

  // Step 4: Calculate final status
  const finalResult = calculateFinalStatusStep({
    total: updateResult.total,
    updated: updateResult.updated,
    failed: updateResult.failed,
  })

  return new WorkflowResponse(finalResult)
})

export default innproPriceUpdateWorkflow
