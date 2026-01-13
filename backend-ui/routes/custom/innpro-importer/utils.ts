// Declare global constant from Vite
declare const __BACKEND_URL__: string | undefined

// Helper to construct API URLs with backend URL
export const getApiUrl = (path: string): string => {
  const backendUrl = (typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : "") || ""
  // Remove trailing slash from backendUrl and leading slash from path
  const cleanBackendUrl = backendUrl.replace(/\/$/, "")
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const fullUrl = `${cleanBackendUrl}${cleanPath}`
  
  // Log for debugging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('[getApiUrl]', { backendUrl, path, fullUrl })
  }
  
  return fullUrl
}

// Helper to make authenticated fetch requests
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies/session for authentication
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const mergedOptions = { ...defaultOptions, ...options }

  // Ensure body is stringified if it's an object and Content-Type is application/json
  if (mergedOptions.body && typeof mergedOptions.body === 'object' && mergedOptions.headers?.['Content-Type'] === 'application/json') {
    mergedOptions.body = JSON.stringify(mergedOptions.body)
  }

  // Log for debugging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('[authenticatedFetch]', { url, method: mergedOptions.method || 'GET', hasCredentials: mergedOptions.credentials === 'include' })
  }

  const response = await fetch(url, mergedOptions)

  // Handle non-OK responses more gracefully
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `HTTP error! Status: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('[authenticatedFetch] Error:', { status: response.status, statusText: response.statusText, errorMessage, errorText })
    }
    
    throw new Error(errorMessage)
  }

  return response
}
