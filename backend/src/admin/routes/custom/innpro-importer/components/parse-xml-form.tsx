import { useState } from "react"
import { getApiUrl, authenticatedFetch } from "../utils"

type ParseXmlFormProps = {
  onSuccess: (data: any) => void
  onError: (error: string) => void
}

export const ParseXmlForm = ({ onSuccess, onError }: ParseXmlFormProps) => {
  const [xmlUrl, setXmlUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!xmlUrl.trim()) {
      onError("Please enter an XML URL")
      return
    }

    setLoading(true)
    try {
      const response = await authenticatedFetch(
        getApiUrl("/admin/innpro-importer/parse"),
        {
          method: "POST",
          body: JSON.stringify({ xmlUrl }),
        }
      )

      // authenticatedFetch throws on non-ok responses, so if we get here, response is ok
      // Get response text first to handle empty or non-JSON responses
      const responseText = await response.text()

      // Parse successful response
      let data
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`)
      }

      onSuccess(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("Parse XML error:", err)
      
      // Provide more helpful error messages for common issues
      let userMessage = errorMessage
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = "Authentication failed. Please make sure you're logged in to the admin panel."
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userMessage = "Network error. Please check that the backend server is running and accessible."
      }
      
      onError(userMessage)
    } finally {
      setLoading(false)
    }
  }

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
        Step 1: Parse XML
      </h2>
      <p style={{
        color: 'var(--fg-subtle)',
        fontSize: '14px',
        marginBottom: '24px',
      }}>
        Enter the URL of the InnPro XML file to download and parse. This will extract all products, categories, and brands.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--fg-base)',
          }}>
            XML URL
          </label>
          <input
            type="url"
            value={xmlUrl}
            onChange={(e) => setXmlUrl(e.target.value)}
            placeholder="https://example.com/products.xml"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              background: 'var(--bg-base)',
              color: 'var(--fg-base)',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !xmlUrl.trim()}
          style={{
            padding: '12px 24px',
            background: loading || !xmlUrl.trim() 
              ? 'var(--bg-subtle)' 
              : 'var(--button-primary-bg)',
            color: loading || !xmlUrl.trim()
              ? 'var(--fg-subtle)'
              : 'var(--button-primary-fg)',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !xmlUrl.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? "Parsing..." : "Parse XML"}
        </button>
      </form>
    </div>
  )
}
