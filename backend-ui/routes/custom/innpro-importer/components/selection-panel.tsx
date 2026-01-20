import { useState, useEffect, useMemo } from "react"
import { getApiUrl, authenticatedFetch } from "../utils"

type SelectionPanelProps = {
  sessionId: string
  sessionData: any
  onComplete: (filters: any) => void
  onReset: () => void
}

export const SelectionPanel = ({ sessionId, sessionData, onComplete, onReset }: SelectionPanelProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [filteredCount, setFilteredCount] = useState<number | null>(null)

  const categories = sessionData.categories || []
  const allBrands = sessionData.brands || []
  const brandToCategories = sessionData.brandToCategories || {} // Map: brandId -> [categoryIds]
  const allProducts = sessionData.products || [] // Full product list for counting (may be empty with streaming approach)

  // Calculate brand counts for selected categories
  // Note: With streaming approach, allProducts may be empty, so we'll use global brand counts
  const brandCountsByCategory = useMemo(() => {
    // If no products array available (streaming approach), return empty object
    // The component will fall back to using global brand counts
    if (selectedCategories.length === 0 || !allProducts || allProducts.length === 0) {
      return {} // No counts if no categories selected or no products
    }

    const counts: Record<string, number> = {} // Map: brandId -> count

    // Count products for each brand within selected categories
    for (const product of allProducts) {
      const catId = product.category?.['@_id'] || product.category?.id
      const brandId = product.producer?.['@_id'] || product.producer?.id

      // Only count if product is in one of the selected categories
      if (catId && brandId && selectedCategories.includes(String(catId))) {
        const brandIdStr = String(brandId)
        counts[brandIdStr] = (counts[brandIdStr] || 0) + 1
      }
    }

    return counts
  }, [selectedCategories, allProducts])

  // Filter brands based on selected categories using the pre-computed mapping
  const filteredBrands = useMemo(() => {
    if (selectedCategories.length === 0) {
      // If no categories selected, show all brands with their global counts
      return allBrands
    }

    // Use the brandToCategories mapping to filter brands
    // A brand should be shown if it has products in at least one of the selected categories
    return allBrands
      .filter((brand: any) => {
        const brandId = String(brand.id)
        const brandCategories = brandToCategories[brandId] || []
        
        // Check if any of the brand's categories are in the selected categories
        return brandCategories.some((catId: string) => selectedCategories.includes(catId))
      })
      .map((brand: any) => {
        // Update brand count to show count within selected categories
        const brandIdStr = String(brand.id)
        const categorySpecificCount = brandCountsByCategory[brandIdStr]
        
        return {
          ...brand,
          count: categorySpecificCount !== undefined ? categorySpecificCount : brand.count
        }
      })
  }, [selectedCategories, allBrands, brandToCategories, brandCountsByCategory])

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    )
  }

  const handleSelectAll = () => {
    setSelectedCategories(categories.map((c: any) => c.id))
    setSelectedBrands(filteredBrands.map((b: any) => b.id))
  }

  const handleDeselectAll = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedProductIds([])
  }

  const handleApplyFilters = async () => {
    const filters = {
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      brands: selectedBrands.length > 0 ? selectedBrands : undefined,
      productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
    }

    // Update selection in session
    try {
      const response = await authenticatedFetch(
        getApiUrl(`/admin/innpro-importer/sessions/${sessionId}/select`),
        {
          method: 'POST',
          body: JSON.stringify(filters),
        }
      )

      if (response.ok) {
        const responseText = await response.text()
        if (responseText) {
          try {
            const data = JSON.parse(responseText)
            setFilteredCount(data.filteredProducts || data.selectedCount)
          } catch (parseError) {
            console.error('Failed to parse response:', parseError)
          }
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('Failed to apply filters:', response.status, errorText)
      }
    } catch (err) {
      console.error('Error applying filters:', err)
    }

    onComplete(filters)
  }

  return (
    <div style={{
      padding: '32px',
      background: 'var(--bg-base)',
      border: '1px solid var(--border-base)',
      borderRadius: '8px',
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--fg-base)',
          }}>
            Step 2: Select Products
          </h2>
          <p style={{
            color: 'var(--fg-subtle)',
            fontSize: '14px',
          }}>
            Select categories and brands to import. Leave empty to import all products.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--fg-base)',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--fg-base)',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Categories */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: 'var(--fg-base)',
          }}>
            Categories ({selectedCategories.length} selected)
          </h3>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid var(--border-base)',
            borderRadius: '6px',
            padding: '8px',
          }}>
            {categories.map((category: any) => (
              <label
                key={category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-subtle)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--fg-base)', flex: 1 }}>
                  {category.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>
                  ({category.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Brands */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: 'var(--fg-base)',
          }}>
            Brands ({selectedBrands.length} selected)
          </h3>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid var(--border-base)',
            borderRadius: '6px',
            padding: '8px',
          }}>
            {filteredBrands.map((brand: any) => (
              <label
                key={brand.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-subtle)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => handleBrandToggle(brand.id)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--fg-base)', flex: 1 }}>
                  {brand.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>
                  ({brand.count})
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-base)',
      }}>
        <div>
          <p style={{ fontSize: '14px', color: 'var(--fg-subtle)', marginBottom: '4px' }}>
            Total Products: {sessionData.totalProducts || 0}
          </p>
          {filteredCount !== null && (
            <p style={{ fontSize: '14px', color: 'var(--fg-base)', fontWeight: '500' }}>
              Selected Products: {filteredCount}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onReset}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: 'var(--fg-base)',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Start Over
          </button>
          <button
            onClick={handleApplyFilters}
            style={{
              padding: '12px 24px',
              background: 'var(--button-primary-bg)',
              color: 'var(--button-primary-fg)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Continue to Review
          </button>
        </div>
      </div>
    </div>
  )
}
