import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SquaresPlus } from "@medusajs/icons"
import { useState, useEffect } from "react"
import { ParseXmlForm } from "./components/parse-xml-form"
import { SelectionPanel } from "./components/selection-panel"
import { ImportPreview } from "./components/import-preview"
import { ImportStatus } from "./components/import-status"
import { getApiUrl, authenticatedFetch } from "./utils"

type ImportStep = 'parse' | 'select' | 'preview' | 'importing'

const InnProImporterPage = () => {
  const [step, setStep] = useState<ImportStep>('parse')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParseSuccess = (data: any) => {
    setSessionId(data.sessionId)
    setSessionData(data)
    setStep('select')
    setError(null)
  }

  const handleSelectionComplete = async (filters: any) => {
    if (!sessionId) return

    setLoading(true)
    try {
      const response = await authenticatedFetch(
        getApiUrl(`/admin/innpro-importer/sessions/${sessionId}/select`),
        {
          method: 'POST',
          body: JSON.stringify(filters),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to update selection'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      const data = responseText ? JSON.parse(responseText) : {}
      setSessionData((prev: any) => ({
        ...prev,
        selectedCount: data.selectedCount || data.filteredProducts || 0,
        filteredProducts: data.filteredProducts || data.selectedCount || 0,
        brandCountsByCategory: data.brandCountsByCategory || {},
      }))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (shippingProfileId?: string) => {
    if (!sessionId) return

    setStep('importing')
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(
        getApiUrl(`/admin/innpro-importer/sessions/${sessionId}/import`),
        {
          method: 'POST',
          body: JSON.stringify({ shippingProfileId }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to start import'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Poll for status updates
      pollImportStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStep('preview')
      setLoading(false)
    }
  }

  const pollImportStatus = async () => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const response = await authenticatedFetch(
          getApiUrl(`/admin/innpro-importer/sessions/${sessionId}`)
        )
        if (response.ok) {
          const responseText = await response.text()
          const data = responseText ? JSON.parse(responseText) : {}
          const status = data.session?.status

          if (status === 'completed' || status === 'failed') {
            clearInterval(interval)
            setLoading(false)
            setStep('parse') // Reset to start
            setSessionId(null)
            setSessionData(null)
            alert(`Import ${status}! Check the products in your catalog.`)
          }
        }
      } catch (err) {
          console.error('Error polling status:', err)
        }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000)
  }

  const handleReset = () => {
    setStep('parse')
    setSessionId(null)
    setSessionData(null)
    setError(null)
  }

  return (
    <div style={{ 
      padding: '32px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          marginBottom: '8px',
          color: 'var(--fg-base)'
        }}>
          InnPro XML Importer
        </h1>
        <p style={{ 
          color: 'var(--fg-subtle)', 
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Import products from InnPro XML feed with category and brand selection
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '32px',
        alignItems: 'center'
      }}>
        {[
          { key: 'parse', label: '1. Parse XML' },
          { key: 'select', label: '2. Select Products' },
          { key: 'preview', label: '3. Review & Import' },
        ].map((s, index) => {
          const stepKeys: ImportStep[] = ['parse', 'select', 'preview']
          const currentStepIndex = stepKeys.indexOf(step)
          const isActive = stepKeys.indexOf(s.key as ImportStep) <= currentStepIndex
          const isCurrent = step === s.key

          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--button-primary-bg)' : 'var(--bg-subtle)',
                  color: isActive ? 'var(--button-primary-fg)' : 'var(--fg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: isCurrent ? '2px solid var(--button-primary-bg)' : 'none',
                  boxShadow: isCurrent ? '0 0 0 2px var(--bg-base)' : 'none',
                }}>
                  {index + 1}
                </div>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  fontWeight: isCurrent ? '500' : '400',
                  color: isActive ? 'var(--fg-base)' : 'var(--fg-subtle)',
                }}>
                  {s.label}
                </span>
              </div>
              {index < 2 && (
                <div style={{
                  width: '100%',
                  height: '2px',
                  background: isActive ? 'var(--button-primary-bg)' : 'var(--border-base)',
                  margin: '0 16px',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '16px',
          background: 'var(--bg-destructive-subtle)',
          border: '1px solid var(--border-destructive)',
          borderRadius: '8px',
          marginBottom: '24px',
          color: 'var(--fg-destructive)',
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading && step !== 'importing' ? (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center',
          color: 'var(--fg-subtle)'
        }}>
          Loading...
        </div>
      ) : (
        <>
          {step === 'parse' && (
            <ParseXmlForm
              onSuccess={handleParseSuccess}
              onError={(err) => setError(err)}
            />
          )}

          {step === 'select' && sessionData && (
            <SelectionPanel
              sessionId={sessionId!}
              sessionData={sessionData}
              onComplete={handleSelectionComplete}
              onReset={handleReset}
            />
          )}

          {step === 'preview' && sessionData && (
            <ImportPreview
              sessionId={sessionId!}
              sessionData={sessionData}
              onImport={handleImport}
              onBack={() => setStep('select')}
            />
          )}

          {step === 'importing' && (
            <ImportStatus
              sessionId={sessionId!}
              onComplete={() => {
                setStep('parse')
                setSessionId(null)
                setSessionData(null)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "InnPro Importer",
  icon: SquaresPlus,
})

export default InnProImporterPage
