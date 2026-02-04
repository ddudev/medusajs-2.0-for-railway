/**
 * Extract a user-facing message from a Medusa/SDK error without throwing.
 * Use when returning errors to the client so they see the backend message (Next.js strips Error.message in production).
 */
export function getMedusaErrorMessage(error: any): string {
  if (error.response) {
    const message = error.response.data?.message ?? error.response.data
    const text = typeof message === "string" ? message : JSON.stringify(message)
    return text.charAt(0).toUpperCase() + text.slice(1).replace(/\.?$/, ".") 
  }
  if (error.request) {
    return "No response received from the server. Please try again."
  }
  const msg = error?.message ? String(error.message) : ""
  // Strip "Error setting up the request: " so the user sees the backend reason (e.g. inventory)
  if (msg.startsWith("Error setting up the request: ")) {
    return msg.slice("Error setting up the request: ".length)
  }
  return msg || "Something went wrong. Please try again."
}

export default function medusaError(error: any): never {
  if (error.response) {
    const u = new URL(error.config?.url ?? "", error.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", error.response.data)
    console.error("Status code:", error.response.status)
    console.error("Headers:", error.response.headers)
    throw new Error(getMedusaErrorMessage(error))
  }
  if (error.request) {
    throw new Error("No response received: " + error.request)
  }
  throw new Error("Error setting up the request: " + (error?.message ?? "Unknown error"))
}
