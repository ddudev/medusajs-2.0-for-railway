import { useState, useEffect } from "react"

type ImportStatusProps = {
  sessionId: string
  onComplete: () => void
}

export const ImportStatus = ({ sessionId, onComplete }: ImportStatusProps) => {
  const [status, setStatus] = useState<string>('importing')
  const [progress, setProgress] = useState<string>('Processing...')

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/admin/innpro-importer/sessions/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          const sessionStatus = data.session?.status

          setStatus(sessionStatus || 'importing')

          if (sessionStatus === 'completed') {
            setProgress('Import completed successfully!')
            clearInterval(interval)
            setTimeout(() => onComplete(), 2000)
          } else if (sessionStatus === 'failed') {
            setProgress('Import failed. Please check the logs.')
            clearInterval(interval)
            setTimeout(() => onComplete(), 3000)
          }
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }, 5000) // Poll every 5s during import

    // Stop polling after 10 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (status === 'importing') {
        setProgress('Import is taking longer than expected. Please check the logs.')
      }
    }, 10 * 60 * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [sessionId, status, onComplete])

  return (
    <div style={{
      padding: '48px',
      background: 'var(--bg-base)',
      border: '1px solid var(--border-base)',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        margin: '0 auto 24px',
        border: '4px solid var(--border-base)',
        borderTopColor: status === 'importing' ? 'var(--button-primary-bg)' : 
                        status === 'completed' ? 'var(--fg-success)' : 'var(--fg-destructive)',
        borderRadius: '50%',
        animation: status === 'importing' ? 'spin 1s linear infinite' : 'none',
      }} />

      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '8px',
        color: 'var(--fg-base)',
      }}>
        {status === 'importing' ? 'Importing Products...' :
         status === 'completed' ? 'Import Completed!' :
         'Import Failed'}
      </h2>

      <p style={{
        color: 'var(--fg-subtle)',
        fontSize: '14px',
        marginBottom: '24px',
      }}>
        {progress}
      </p>

      {status === 'importing' && (
        <p style={{
          color: 'var(--fg-muted)',
          fontSize: '12px',
        }}>
          This may take a few minutes. Please do not close this page.
        </p>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
