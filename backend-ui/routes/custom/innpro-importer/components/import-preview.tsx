import { useState, useEffect } from "react"
import { getApiUrl, authenticatedFetch } from "../utils"

type ImportPreviewProps = {
  sessionId: string
  sessionData: any
  onImport: (shippingProfileId?: string) => void
  onBack: () => void
}

export const ImportPreview = ({ sessionId, sessionData, onImport, onBack }: ImportPreviewProps) => {
  const [sessionDetails, setSessionDetails] = useState<any>(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await authenticatedFetch(
          getApiUrl(`/admin/innpro-importer/sessions/${sessionId}`)
        )
        if (response.ok) {
          const responseText = await response.text()
          if (responseText) {
            try {
              const data = JSON.parse(responseText)
              setSessionDetails(data.session)
            } catch (parseError) {
              console.error('Failed to parse session response:', parseError)
            }
          }
        }
      } catch (err) {
        console.error('Error loading session:', err)
      }
    }

    loadSession()
  }, [sessionId])

  // Calculate selected count based on what was actually filtered
  // This should be the count of products that match BOTH selected categories AND selected brands
  // Priority: selectedCount from sessionData > filteredProducts from sessionData > recalculate if needed
  const selectedCount = sessionData?.selectedCount || 
                       sessionData?.filteredProducts || 
                       (sessionDetails?.selected_categories?.length || sessionDetails?.selected_brands?.length 
                         ? 0 // If filters are set but no count, show 0 until loaded
                         : sessionData?.totalProducts || 0)

  return (
    <div style={{
      padding: '32px',
      background: 'var(--bg-base)',
      border: '1px solid var(--border-base)',
      borderRadius: '8px',
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
        color: 'var(--fg-base)',
      }}>
        Step 3: Review & Import
      </h2>
      <p style={{
        color: 'var(--fg-subtle)',
        fontSize: '14px',
        marginBottom: '24px',
      }}>
        Review your selection and start the import process.
      </p>

      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-base)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginBottom: '4px' }}>
              Total Products in XML
            </p>
            <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--fg-base)' }}>
              {sessionData?.totalProducts || 0}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginBottom: '4px' }}>
              Selected for Import
            </p>
            <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--button-primary-bg)' }}>
              {selectedCount}
            </p>
          </div>
        </div>

        {sessionDetails?.selected_categories?.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-base)' }}>
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginBottom: '8px' }}>
              Selected Categories
            </p>
            <p style={{ fontSize: '14px', color: 'var(--fg-base)' }}>
              {sessionDetails.selected_categories.length} category(ies)
            </p>
          </div>
        )}

        {sessionDetails?.selected_brands?.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-base)' }}>
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginBottom: '8px' }}>
              Selected Brands
            </p>
            <p style={{ fontSize: '14px', color: 'var(--fg-base)' }}>
              {sessionDetails.selected_brands.length} brand(s)
            </p>
          </div>
        )}
      </div>

      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-base)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--fg-base)', marginBottom: '8px', fontWeight: '500' }}>
          Import Information
        </p>
        <ul style={{ fontSize: '14px', color: 'var(--fg-subtle)', paddingLeft: '20px', margin: 0 }}>
          <li>Products will be imported as drafts</li>
          <li>Variants will be created from product sizes</li>
          <li>Images will be linked from XML URLs</li>
          <li>Weight, dimensions, and HS codes will be imported</li>
          <li>All additional data will be stored in metadata</li>
        </ul>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-base)',
      }}>
        <button
          onClick={onBack}
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
          Back to Selection
        </button>
        <button
          onClick={() => onImport()}
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
          Start Import
        </button>
      </div>
    </div>
  )
}
