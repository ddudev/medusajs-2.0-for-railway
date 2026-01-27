import { useState } from "react"
import { getApiUrl, authenticatedFetch } from "../utils"

interface PriceUpdateResult {
  success: boolean
  totalProducts: number
  updatedProducts: number
  failedProducts: number
  status: 'completed' | 'completed_with_errors' | 'failed'
}

export const PriceUpdateTrigger = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PriceUpdateResult | null>(null)

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
        setResult({
          success: false,
          totalProducts: 0,
          updatedProducts: 0,
          failedProducts: 0,
          status: 'failed',
        })
        return
      }

      const responseText = await response.text()
      const data: PriceUpdateResult = responseText ? JSON.parse(responseText) : {}
      
      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        totalProducts: 0,
        updatedProducts: 0,
        failedProducts: 0,
        status: 'failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      data-testid="price-update-trigger"
      style={{
        padding: '20px',
        background: 'var(--bg-base)',
        border: '1px solid var(--border-base)',
        borderRadius: '8px',
        marginBottom: '32px',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: result ? '16px' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '6px',
            color: 'var(--fg-base)',
          }}>
            Price & Inventory Update
          </h2>
          <p style={{
            color: 'var(--fg-subtle)',
            fontSize: '13px',
            margin: 0,
            lineHeight: '1.5',
          }}>
            Manually trigger price and inventory sync from InnPro XML feed
          </p>
        </div>
        <button
          onClick={handleTriggerUpdate}
          disabled={loading}
          style={{
            padding: '10px 20px',
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
            minWidth: '130px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.opacity = '0.9'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'translateY(0)'
            }
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
          background: 'var(--bg-subtle)',
          borderRadius: '6px',
          border: `1px solid ${result.success ? 'var(--border-success)' : 'var(--border-error)'}`,
        }}>
          {/* Summary */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-base)',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: result.success ? 'var(--bg-success-subtle)' : 'var(--bg-error-subtle)',
              color: result.success ? 'var(--fg-success)' : 'var(--fg-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              flexShrink: 0,
            }}>
              {result.success ? '✓' : '✗'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--fg-base)',
                marginBottom: '2px',
              }}>
                {result.success
                  ? `Successfully updated ${result.updatedProducts}/${result.totalProducts} products`
                  : `Update ${result.status === 'failed' ? 'failed' : 'completed with errors'}`}
              </div>
              {result.success && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--fg-subtle)',
                }}>
                  Price and inventory updates completed
                </div>
              )}
            </div>
          </div>

          {/* Detailed Results */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '12px',
            marginTop: '12px',
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--bg-base)',
              borderRadius: '4px',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--fg-subtle)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '500',
              }}>
                Total Products
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--fg-base)',
              }}>
                {result.totalProducts}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-base)',
              borderRadius: '4px',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--fg-subtle)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '500',
              }}>
                Updated
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--fg-success)',
              }}>
                {result.updatedProducts}
              </div>
            </div>
            {result.failedProducts > 0 && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-base)',
                borderRadius: '4px',
                border: '1px solid var(--border-base)',
              }}>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--fg-error)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '500',
                }}>
                  Failed
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--fg-error)',
                }}>
                  {result.failedProducts}
                </div>
              </div>
            )}
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--fg-subtle)',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}>
            <span>💡</span>
            <span>Tip: Check backend logs for detailed information</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!result && !loading && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--bg-subtle)',
          borderRadius: '6px',
          border: '1px solid var(--border-base)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <span style={{
            fontSize: '16px',
            lineHeight: '1.2',
            flexShrink: 0,
          }}>ℹ️</span>
          <div style={{
            fontSize: '12px',
            color: 'var(--fg-subtle)',
            lineHeight: '1.5',
          }}>
            This will sync prices and inventory for all products from the configured InnPro XML feed.
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
