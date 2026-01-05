import { NextRequest, NextResponse } from 'next/server'

/**
 * PostHog Reverse Proxy
 * Routes PostHog requests through your own domain to prevent ad blockers from blocking tracking
 * 
 * Setup:
 * 1. In PostHog dashboard: Settings > Project > Reverse Proxy
 * 2. Set reverse proxy URL to: https://yourdomain.com/api/posthog
 * 3. Update NEXT_PUBLIC_POSTHOG_HOST to use your domain (optional, but recommended)
 * 
 * This route proxies requests to PostHog's API
 */
export async function GET(request: NextRequest) {
  return proxyRequest(request)
}

export async function POST(request: NextRequest) {
  return proxyRequest(request)
}

async function proxyRequest(request: NextRequest) {
  const posthogHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  const url = new URL(request.url)
  
  // Get the path after /api/posthog
  // Handle both /api/posthog and /api/posthog/ paths
  let posthogPath = url.pathname.replace(/^\/api\/posthog\/?/, '')
  // Ensure path starts with /
  if (posthogPath && !posthogPath.startsWith('/')) {
    posthogPath = '/' + posthogPath
  }
  // Default to /batch/ if no path specified (main PostHog endpoint)
  if (!posthogPath || posthogPath === '/') {
    posthogPath = '/batch/'
  }
  
  const posthogUrl = `${posthogHost}${posthogPath}${url.search}`
  
  try {
    // Get request body if it exists
    const body = request.method === 'POST' ? await request.text() : undefined
    
    // Forward the request to PostHog
    const response = await fetch(posthogUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
        // Forward other relevant headers
        ...(request.headers.get('referer') && { 'Referer': request.headers.get('referer')! }),
      },
      body: body,
    })
    
    // Get response data
    const data = await response.text()
    
    // Return response with appropriate headers
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('PostHog proxy error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Proxy request failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
