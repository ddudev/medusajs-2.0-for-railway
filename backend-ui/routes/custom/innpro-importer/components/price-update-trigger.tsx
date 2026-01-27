import { useState } from "react"
import { getApiUrl, authenticatedFetch } from "../utils"

interface PriceUpdateResult {
  success: boolean
  totalConfigs: number
  successful: number
  failed: number
  results?: Array<{
    configId: string
    configName: string
    result: {
      updated: number
      failed: number
      total: number
      inventoryUpdated?: number
      inventoryFailed?: number
    }
  }>
  errors?: string[]
}

export const PriceUpdateTrigger = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PriceUpdateResult | null>(null)

  // Debug: Log when component mounts
  if (typeof window !== 'undefined') {
    console.log('PriceUpdateTrigger component mounted')
  }

  const handleTriggerUpdate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await authenticatedFetch(
        getApiUrl('/admin/innpro-importer/price-update'),
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to trigger price update'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      const data: PriceUpdateResult = responseText ? JSON.parse(responseText) : {}
      
      setResult(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setResult({
        success: false,
        totalConfigs: 0,
        successful: 0,
        failed: 1,
        errors: [errorMessage],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      data-testid="price-update-trigger"
      style={{
        padding: '24px',
        background: 'var(--bg-subtle)',
        border: '2px solid var(--button-primary-bg)',
        borderRadius: '8px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '16px' 
      }}>
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--fg-base)',
          }}>
            Price & Inventory Update
          </h2>
          <p style={{
            color: 'var(--fg-subtle)',
            fontSize: '14px',
            margin: 0,
          }}>
            Manually trigger price and inventory sync from InnPro XML feed
          </p>
        </div>
        <button
          onClick={handleTriggerUpdate}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading 
              ? 'var(--bg-subtle)' 
              : 'var(--button-primary-bg)',
            color: loading
              ? 'var(--fg-subtle)'
              : 'var(--button-primary-fg)',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              Updating...
            </>
          ) : (
            <>
              <span>⟳</span>
              Update Now
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {result && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'var(--bg-base)',
          borderRadius: '6px',
          border: `1px solid ${result.success ? 'var(--border-success)' : 'var(--border-error)'}`,
        }}>
          {/* Summary */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '12px' 
          }}>
            <span style={{ 
              fontSize: '18px',
              color: result.success ? 'var(--fg-success)' : 'var(--fg-error)',
            }}>
              {result.success ? '✓' : '✗'}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--fg-base)',
            }}>
              {result.success
                ? `Successfully processed ${result.successful}/${result.totalConfigs} config(s)`
                : `Failed: ${result.failed} error(s)`}
            </span>
          </div>

          {/* Detailed Results */}
          {result.results && result.results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {result.results.map((configResult, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: 'var(--fg-base)',
                  }}>
                    {configResult.configName}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '8px' 
                  }}>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--fg-subtle)',
                        marginBottom: '4px',
                      }}>
                        Products Updated
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--fg-base)',
                      }}>
                        {configResult.result.updated}/{configResult.result.total}
                      </div>
                    </div>
                    {configResult.result.inventoryUpdated !== undefined && (
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--fg-subtle)',
                          marginBottom: '4px',
                        }}>
                          Inventory Updated
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--fg-base)',
                        }}>
                          {configResult.result.inventoryUpdated} variants
                        </div>
                      </div>
                    )}
                    {configResult.result.failed > 0 && (
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--fg-error)',
                          marginBottom: '4px',
                        }}>
                          Failed
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--fg-error)',
                        }}>
                          {configResult.result.failed} products
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--fg-error)',
                marginBottom: '8px',
              }}>
                Errors:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {result.errors.map((error, index) => (
                  <li key={index}>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--fg-error)',
                    }}>
                      {error}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{
            fontSize: '12px',
            color: 'var(--fg-subtle)',
            marginTop: '12px',
          }}>
            💡 Tip: Check backend logs for detailed information
          </div>
        </div>
      )}

      {/* Info Box */}
      {!result && !loading && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--bg-base)',
          borderRadius: '6px',
          border: '1px solid var(--border-base)',
        }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--fg-subtle)',
          }}>
            ℹ️ This will sync prices and inventory for all products from the configured InnPro XML feed.
            The automated job runs every 2 hours.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
