import type {
  ConsentCategories,
  ConsentCategory,
  ScriptConfig,
} from "./types"

interface ManagedScript extends ScriptConfig {
  element?: HTMLScriptElement
  loaded: boolean
}

const scriptRegistry = new Map<string, ManagedScript>()
const cleanupRegistry = new Map<string, () => void>()

export function registerScript(config: ScriptConfig): void {
  if (scriptRegistry.has(config.id)) {
    console.warn(
      `[CookieConsent] Script with id "${config.id}" is already registered`
    )
    return
  }

  scriptRegistry.set(config.id, {
    ...config,
    loaded: false,
  })
}

export function unregisterScript(id: string): void {
  const script = scriptRegistry.get(id)
  if (script) {
    unloadScript(id)
    scriptRegistry.delete(id)
  }
}

export function loadScript(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const managed = scriptRegistry.get(id)
    if (!managed) {
      reject(new Error(`Script "${id}" is not registered`))
      return
    }

    if (managed.loaded && managed.element) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.id = `consent-script-${id}`
    script.async = true

    if (managed.src) {
      script.src = managed.src
    } else if (managed.content) {
      script.textContent = managed.content
    } else {
      reject(new Error(`Script "${id}" has no src or content`))
      return
    }

    if (managed.attributes) {
      Object.entries(managed.attributes).forEach(([key, value]) => {
        script.setAttribute(key, value)
      })
    }

    if (managed.content) {
      if (managed.strategy === "beforeInteractive") {
        document.head.appendChild(script)
      } else {
        document.body.appendChild(script)
      }

      setTimeout(() => {
        managed.loaded = true
        managed.element = script
        managed.onLoad?.()
        resolve()
      }, 0)
    } else {
      script.onload = () => {
        managed.loaded = true
        managed.element = script
        managed.onLoad?.()
        resolve()
      }

      script.onerror = () => {
        const error = new Error(`Failed to load script "${id}"`)
        managed.onError?.(error)
        reject(error)
      }

      if (managed.strategy === "beforeInteractive") {
        document.head.appendChild(script)
      } else {
        document.body.appendChild(script)
      }
    }
  })
}

export function unloadScript(id: string): void {
  const managed = scriptRegistry.get(id)
  if (!managed) return

  if (managed.element) {
    managed.element.remove()
    managed.element = undefined
  }

  const existingScript = document.getElementById(`consent-script-${id}`)
  if (existingScript) {
    existingScript.remove()
  }

  managed.onRevoke?.()

  const cleanup = cleanupRegistry.get(id)
  if (cleanup) {
    cleanup()
    cleanupRegistry.delete(id)
  }

  managed.loaded = false
}

export function registerCleanup(id: string, cleanup: () => void): void {
  cleanupRegistry.set(id, cleanup)
}

export function loadConsentedScripts(categories: ConsentCategories): void {
  scriptRegistry.forEach((script, id) => {
    if (categories[script.category] && !script.loaded) {
      loadScript(id).catch((error) => {
        console.error(`[CookieConsent] Failed to load script "${id}":`, error)
      })
    }
  })
}

export function unloadRevokedScripts(
  previousCategories: ConsentCategories,
  currentCategories: ConsentCategories
): ConsentCategory[] {
  const revokedCategories: ConsentCategory[] = []

  ;(Object.keys(previousCategories) as ConsentCategory[]).forEach((category) => {
    if (previousCategories[category] && !currentCategories[category]) {
      revokedCategories.push(category)
    }
  })

  scriptRegistry.forEach((script, id) => {
    if (revokedCategories.includes(script.category) && script.loaded) {
      unloadScript(id)
    }
  })

  return revokedCategories
}

export function getLoadedScripts(): string[] {
  const loaded: string[] = []
  scriptRegistry.forEach((script, id) => {
    if (script.loaded) {
      loaded.push(id)
    }
  })
  return loaded
}

export function hasGoogleScripts(): boolean {
  for (const script of scriptRegistry.values()) {
    if (
      (script.src &&
        (script.src.includes("googletagmanager.com") ||
          script.src.includes("google-analytics.com") ||
          script.src.includes("googleadservices.com") ||
          script.src.includes("google.com/analytics") ||
          script.src.includes("google.com/ads") ||
          script.src.includes("doubleclick.net") ||
          script.src.includes("googleapis.com/gtag"))) ||
      (script.content &&
        (script.content.includes("googletagmanager.com") ||
          script.content.includes("google-analytics.com") ||
          script.content.includes("gtag(") ||
          script.content.includes("dataLayer") ||
          script.content.includes("ga(") ||
          script.content.includes("google-analytics")))
    ) {
      return true
    }
  }
  return false
}

export const scriptCleanupHelpers = {
  googleAnalytics: () => {
    if (typeof window === "undefined") return
    const cookies = document.cookie.split(";")
    cookies.forEach((cookie) => {
      const name = cookie.split("=")[0].trim()
      if (
        name.startsWith("_ga") ||
        name.startsWith("_gid") ||
        name.startsWith("_gat")
      ) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
      }
    })
    ;(window as unknown as Record<string, unknown>).ga = undefined
    ;(window as unknown as Record<string, unknown>).gtag = undefined
    ;(window as unknown as Record<string, unknown>).dataLayer = undefined
  },

  facebookPixel: () => {
    if (typeof window === "undefined") return
    const cookies = document.cookie.split(";")
    cookies.forEach((cookie) => {
      const name = cookie.split("=")[0].trim()
      if (name.startsWith("_fbp") || name.startsWith("_fbc")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
      }
    })
    ;(window as unknown as Record<string, unknown>).fbq = undefined
  },
}
