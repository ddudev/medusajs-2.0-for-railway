'use client'

import { useToasts } from '@lib/store/ui-store'
import { Alert, Snackbar, Button } from '@mui/material'

/**
 * Toast notification container
 * Displays all active toasts from Zustand UI store
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToasts()

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration || 3000}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          // Stack toasts vertically
          style={{ bottom: `${24 + index * 70}px` }}
        >
          <Alert
            severity={toast.type}
            onClose={() => removeToast(toast.id)}
            action={
              toast.action && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    toast.action?.onClick()
                    removeToast(toast.id)
                  }}
                >
                  {toast.action.label}
                </Button>
              )
            }
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}
