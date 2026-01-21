/**
 * Ollama Translation Service
 * Handles translation of text from English to Bulgarian using Ollama API
 */

export interface OllamaTranslationService {
  translate(text: string, targetLang: string): Promise<string>
  translateBatch(texts: string[], targetLang: string): Promise<string[]>
}

export class OllamaTranslationServiceImpl implements OllamaTranslationService {
  public readonly baseUrl: string
  protected model: string
  protected timeout: number

  constructor(
    baseUrl: string = 'http://localhost:11434', 
    model: string = process.env.OLLAMA_MODEL || 'gemma3:latest', 
    timeout: number = 120000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.model = model
    this.timeout = timeout
  }

  /**
   * Clean AI response to remove common artifacts and prefixes
   */
  private cleanResponse(text: string): string {
    if (!text) return text

    let cleaned = text.trim()

    // Remove common AI response prefixes
    const prefixes = [
      /^Translation:\s*/i,
      /^Output:\s*/i,
      /^Result:\s*/i,
      /^Here is.*?:\s*/i,
      /^The translation is:\s*/i,
      /^Translated text:\s*/i,
      /^Bulgarian translation:\s*/i,
      /^Translation \(Bulgarian\):\s*/i,
      /^Превод:\s*/i,
      /^Резултат:\s*/i,
      /^[А-Яа-я]+ превод:\s*/i,
      /^Rules:\s*/i,
      /^Правила\s*:\s*/i,
    ]

    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '')
    }

    // Also remove "Rules:" or "Правила:" if they appear anywhere in the text (not just at start)
    cleaned = cleaned.replace(/\bRules:\s*/gi, '')
    cleaned = cleaned.replace(/\bПравила\s*:\s*/gi, '')
    
    // Remove leaked prompt text that appears in translations
    cleaned = cleaned.replace(/Обикновено ВАЖНО.*?обяснения\./gi, '')
    cleaned = cleaned.replace(/IMPORTANT.*?explanations\./gi, '')
    cleaned = cleaned.replace(/Return ONLY.*?explanations\./gi, '')
    cleaned = cleaned.replace(/Върнете САМО.*?обяснения\./gi, '')

    // Remove quotes if entire response is wrapped
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1)
    }

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\w]*\n?/g, '').replace(/```/g, '')

    // Remove zero-width and control characters (except newlines/tabs)
    cleaned = cleaned
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Control chars except \n, \r, \t

    return cleaned.trim()
  }

  /**
   * Translate a single text string
   */
  async translate(text: string, targetLang: string = 'bg', customTimeout?: number): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text
    }

    const startTime = Date.now()
    const prompt = targetLang === 'bg' || targetLang === 'bulgarian'
      ? `Translate this text to Bulgarian. Return ONLY the Bulgarian translation, nothing else.

Text to translate:
${text}

IMPORTANT: Return ONLY the translated text. Do not include the word "Rules", "Правила", or any labels or explanations.

Bulgarian translation:`
      : `Translate this text to ${targetLang}. Return ONLY the translation, nothing else.

Text to translate:
${text}

IMPORTANT: Return ONLY the translated text. Do not include any labels or explanations.

${targetLang} translation:`

    const timeout = customTimeout || this.timeout

    try {
      const ollamaStartTime = Date.now()
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            // Set context window to max supported by gemma3:latest (124K tokens)
            num_ctx: 124000,
          },
        }),
        signal: AbortSignal.timeout(timeout),
      })
      const ollamaFetchTime = Date.now() - ollamaStartTime

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const parseStartTime = Date.now()
      const data = await response.json()
      const parseTime = Date.now() - parseStartTime
      
      // Ollama returns the response in the 'response' field
      let translatedText = data.response?.trim() || data.text?.trim() || text
      const responseLength = translatedText.length
      
      const cleanStartTime = Date.now()
      // Clean AI artifacts
      translatedText = this.cleanResponse(translatedText)
      const cleanTime = Date.now() - cleanStartTime
      
      const totalTime = Date.now() - startTime
      
      // Log only for longer texts or if it took significant time
      if (text.length > 100 || totalTime > 1000) {
        console.log(`[OLLAMA TRANSLATE] Input: ${text.length} chars, Prompt: ${prompt.length} chars | Fetch: ${ollamaFetchTime}ms | Parse JSON: ${parseTime}ms | Clean: ${cleanTime}ms | Output: ${responseLength} chars | Total: ${totalTime}ms`)
      }
      
      return translatedText
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.log(`[OLLAMA TRANSLATE] Input: ${text.length} chars | FAILED after ${totalTime}ms | Error: ${errorMsg}`)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Translation timeout after ${timeout}ms`)
      }
      throw error
    }
  }

  /**
   * Translate product title preserving brand and model using AI
   * Uses AI to intelligently identify and preserve brand names and model numbers
   */
  async translateTitle(title: string, brandName?: string, targetLang: string = 'bg'): Promise<string> {
    if (!title || title.trim().length === 0) {
      return title
    }

    const startTime = Date.now()
    // Use AI to intelligently translate while preserving brand and model
    const prompt = targetLang === 'bg' || targetLang === 'bulgarian'
      ? `Translate this product title to Bulgarian. Keep brand names and model numbers exactly as written. Only translate descriptive words.

Title: "${title}"
${brandName ? `Brand: "${brandName}"` : ''}

Examples:
"xTool MetalFab 1200W laser welding machine" → "xTool MetalFab 1200W лазерна машина за заваряване"
"Maono BA92 Boom Arm Black" → "Maono BA92 Ръкав за микрофон Черен"

IMPORTANT: Return ONLY the translated title. Do not include "Rules", "Правила", or any other text.

Translated title:`
      : `Translate this product title to ${targetLang}. Keep brand names and model numbers exactly as written. Only translate descriptive words.

Title: "${title}"
${brandName ? `Brand: "${brandName}"` : ''}

IMPORTANT: Return ONLY the translated title. Do not include any labels or explanations.

Translated title:`

    try {
      const ollamaStartTime = Date.now()
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      })
      const ollamaFetchTime = Date.now() - ollamaStartTime

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const parseStartTime = Date.now()
      const data = await response.json()
      const parseTime = Date.now() - parseStartTime
      
      let translatedTitle = data.response?.trim() || data.text?.trim() || title
      const responseLength = translatedTitle.length

      const cleanStartTime = Date.now()
      // Clean AI artifacts (especially important for titles)
      translatedTitle = this.cleanResponse(translatedTitle)

      // For titles, also collapse whitespace and remove line breaks
      translatedTitle = translatedTitle.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim()
      const cleanTime = Date.now() - cleanStartTime

      const totalTime = Date.now() - startTime
      console.log(`[OLLAMA TITLE] Title: "${title.substring(0, 50)}" | Prompt: ${prompt.length} chars | Fetch: ${ollamaFetchTime}ms | Parse JSON: ${parseTime}ms | Clean: ${cleanTime}ms | Output: ${responseLength} chars | Total: ${totalTime}ms`)

      // If translation failed or returned empty, return original
      if (!translatedTitle || translatedTitle.length === 0) {
        return title
      }

      return translatedTitle
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.log(`[OLLAMA TITLE] Title: "${title.substring(0, 50)}" | FAILED after ${totalTime}ms | Error: ${errorMsg}`)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Translation timeout after ${this.timeout}ms`)
      }
      // On error, return original title
      return title
    }
  }

  /**
   * Translate multiple texts in batch
   * Processes texts sequentially to avoid overwhelming Ollama
   */
  async translateBatch(texts: string[], targetLang: string = 'bg'): Promise<string[]> {
    if (!texts || texts.length === 0) {
      return []
    }

    // Filter out empty texts
    const nonEmptyTexts = texts.filter(t => t && t.trim().length > 0)
    
    if (nonEmptyTexts.length === 0) {
      return texts // Return original array with empty strings
    }

    // Process translations sequentially to avoid overwhelming Ollama
    // This is especially important for long descriptions
    const translations: string[] = []
    
    for (let index = 0; index < nonEmptyTexts.length; index++) {
      const text = nonEmptyTexts[index]
      
      try {
        // For very long texts (descriptions), use a longer timeout
        const isLongText = text.length > 5000
        const timeout = isLongText ? 300000 : undefined // 5 minutes for long descriptions
        
        const translation = await this.translate(text, targetLang, timeout)
        
        translations.push(translation)
      } catch (error) {
        console.warn(`[OLLAMA TRANSLATE] Batch item ${index + 1}/${nonEmptyTexts.length} (${text.length} chars) FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Return original text on error, but log it
        translations.push(text)
      }
    }

    // Map translations back to original array positions
    let translationIndex = 0
    return texts.map(text => {
      if (text && text.trim().length > 0) {
        return translations[translationIndex++]
      }
      return text
    })
  }
}

export default OllamaTranslationServiceImpl
