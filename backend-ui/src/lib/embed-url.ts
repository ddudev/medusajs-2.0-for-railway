/**
 * Extract a valid iframe URL from raw input (handles pasted iframe HTML or plain URL).
 * Returns null if invalid to avoid "URI malformed" and broken embeds.
 */
export function normalizeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null
  let url = raw.trim()
  const srcMatch = url.match(/src\s*=\s*["']([^"']+)["']/i)
  if (srcMatch) url = srcMatch[1].trim()
  if (!url) return null
  try {
    new URL(url)
    return url
  } catch {
    return null
  }
}
