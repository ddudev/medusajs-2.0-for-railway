/**
 * ChatGPT AI Service
 * Handles translation, vision analysis, and SEO optimization using OpenAI GPT-4o models
 * Drop-in replacement for OllamaService
 *
 * finish_reason: length — When the model hits max_completion_tokens the response is cut off.
 * We use generous limits and a one-time retry so we get full output instead of wasting tokens.
 * @see https://community.openai.com/t/tips-for-handling-finish-reason-length-with-json/806445
 * @see https://platform.openai.com/docs/api-reference/chat/create#chat-create-max_completion_tokens
 *
 * Reasoning (per https://platform.openai.com/docs/guides/reasoning):
 * - For reasoning models (gpt-5, gpt-5-mini, o1, o3, o4-mini) we use the Responses API with
 *   reasoning: { effort: 'low' } to favor speed and economical token usage.
 * - For Chat Completions (non–Responses models) we only pass reasoning_effort: 'low' for
 *   o-series, and never send it to gpt-4o etc. (400 if sent).
 * @see https://github.com/openai/openai-node
 */

import { info } from 'console'
import OpenAI from 'openai'
import { loadPrompt } from '../utils/prompt-loader'

/** True for models that support the Responses API reasoning param (gpt-5*, o1, o3, o4*). */
function useResponsesAPIForReasoning(modelId: string): boolean {
  const m = (modelId ?? '').trim().toLowerCase()
  return m.startsWith('gpt-5') || /^o\d/.test(m)
}

/** True for o-series only (Chat Completions uses reasoning_effort for these). */
function isOSeriesModel(modelId: string): boolean {
  return /^o\d/i.test((modelId ?? '').trim())
}

export interface ChatGPTConfig {
  apiKey?: string
  model?: string
  timeout?: number
}

export interface ImageAnalysisResult {
  features: string[]
  colors: string[]
  materials: string[]
  textOnProduct: string[]
  suggestedKeywords: string[]
}

export interface ProductEnhancementInput {
  title: string
  description?: string
  material?: string
  subtitle?: string
  images: { url: string; alt?: string }[]
  isComplex: boolean
  existingMetadata?: Record<string, any>
}

export interface ProductEnhancementOutput {
  title: string
  description: string
  metadata: {
    meta_title: string
    meta_description: string
    og_title: string
    og_description: string
    og_image?: string
    keywords: string[]
  }
}

export class ChatGPTService {
  private client: OpenAI
  protected model: string
  protected timeout: number

  constructor(config: ChatGPTConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    })
    // Use gpt-5-mini by default (fast, cheap, no reasoning overhead)
    // Options: gpt-5-mini, gpt-4o, gpt-4-turbo
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-5-mini'
    this.timeout = config.timeout || 120000
  }

  /**
   * Clean AI response to remove common artifacts
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
    ]

    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '')
    }

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\w]*\n?/g, '').replace(/```/g, '')

    // Extract JSON if there's extra content after it
    if (cleaned.includes('{') && cleaned.includes('}')) {
      const firstBrace = cleaned.indexOf('{')
      let depth = 0
      let lastBrace = firstBrace
      
      for (let i = firstBrace; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++
        if (cleaned[i] === '}') {
          depth--
          if (depth === 0) {
            lastBrace = i
            break
          }
        }
      }
      
      if (lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
      }
    }

    // Remove quotes if entire response is wrapped
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1)
    }

    // Remove literal \n characters (replace with space for clean text flow)
    cleaned = cleaned.replace(/\\n/g, ' ')
    
    // Remove multiple spaces that might result from the above replacement
    cleaned = cleaned.replace(/\s+/g, ' ')

    return cleaned.trim()
  }

  /**
   * Fix invalid JSON escape sequences
   * ChatGPT sometimes returns JSON with invalid escapes like '\ ' (backslash + space)
   */
  private fixInvalidJsonEscapes(jsonString: string): string {
    if (!jsonString) return jsonString

    // Fix invalid escape sequences:
    // 1. Backslash followed by space (should just be the space)
    // 2. Other invalid escapes that are not: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    
    let fixed = jsonString
    
    // Replace backslash + space with just space
    fixed = fixed.replace(/\\ /g, ' ')
    
    // Fix other invalid single-char escapes (keep valid ones: ", \, /, b, f, n, r, t, u)
    // This regex finds backslash followed by a char that's NOT a valid escape char or digit (for \uXXXX)
    fixed = fixed.replace(/\\([^"\\\/bfnrtu0-9])/g, '$1')
    
    return fixed
  }

  /**
   * Make a request to OpenAI ChatGPT API.
   * When the model returns empty content with finish_reason "length" (reasoning models
   * using all tokens for "thinking"), retries once with higher max_completion_tokens
   * so the model has room to output the actual answer instead of wasting tokens.
   * When responseFormat is 'json_object', the API returns valid JSON only (no cleaning needed).
   */
  private async callChatGPT(
    prompt: string,
    options: {
      timeout?: number
      max_completion_tokens?: number
      _retry?: boolean
      /** Use response_format: json_object for guaranteed valid JSON; skip cleanResponse/fixInvalidJsonEscapes */
      responseFormat?: 'json_object'
    } = {}
  ): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout)
    const maxTokens = options.max_completion_tokens ?? 4000

    try {
      console.log(`[CHATGPT] Calling API with model: ${this.model}, max_completion_tokens: ${maxTokens}${options.responseFormat === 'json_object' ? ', json_object' : ''}${options._retry ? ' (retry with more tokens)' : ''}`)

      let rawResponse: unknown

      if (useResponsesAPIForReasoning(this.model)) {
        // Responses API (per https://platform.openai.com/docs/guides/reasoning): use
        // reasoning: { effort: 'low' } for speed and economical token usage.
        const responsesBody: Record<string, unknown> = {
          model: this.model,
          input: [{ role: 'user', content: prompt }],
          max_output_tokens: maxTokens,
          reasoning: { effort: 'low' },
        }
        if (options.responseFormat === 'json_object') {
          responsesBody.text = { format: { type: 'json_object' } }
        }
        try {
          rawResponse = await this.client.responses.create(
            responsesBody as unknown as Parameters<OpenAI['responses']['create']>[0],
            { signal: controller.signal as AbortSignal }
          )
        } catch (abortError: unknown) {
          clearTimeout(timeoutId)
          const err = abortError instanceof Error ? abortError : new Error(String(abortError))
          const isAbort =
            err.name === 'AbortError' ||
            err.name === 'APIUserAbortError' ||
            err.message?.includes('aborted') ||
            err.message?.includes('Request was aborted')
          if (isAbort && !options._retry) {
            const baseTimeout = options.timeout ?? this.timeout
            const retryTimeout = Math.min(300000, baseTimeout * 2)
            console.warn('[CHATGPT] Request aborted (' + err.name + '), retrying once with timeout=' + retryTimeout + 'ms')
            return this.callChatGPT(prompt, {
              timeout: retryTimeout,
              max_completion_tokens: options.max_completion_tokens,
              _retry: true,
              responseFormat: options.responseFormat,
            })
          }
          throw abortError
        }
        clearTimeout(timeoutId)
        const resp = rawResponse as {
          output_text?: string
          output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
        }
        let content = resp.output_text ?? ''
        if (!content && Array.isArray(resp.output)) {
          for (const item of resp.output) {
            const parts = item?.content
            if (!Array.isArray(parts)) continue
            for (const part of parts) {
              if (part?.text) content += part.text
            }
          }
        }
        if (!content && resp.output?.[0]?.content?.[0]?.text) {
          content = resp.output[0].content[0].text
        }
        console.log(`[CHATGPT] Responses API: ${content.length} chars`)
        if (!content && !options._retry) {
          console.warn('[CHATGPT] Responses API returned empty output_text')
        }
        return content
      }

      // Chat Completions API: only send reasoning_effort for o-series (o1, o3, o4-mini).
      const body: Record<string, unknown> = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: maxTokens,
      }
      if (isOSeriesModel(this.model)) {
        body.reasoning_effort = 'low'
      }
      if (options.responseFormat === 'json_object') {
        body.response_format = { type: 'json_object' }
      }

      try {
        rawResponse = await this.client.chat.completions.create(
          body as unknown as Parameters<OpenAI['chat']['completions']['create']>[0],
          { signal: controller.signal as AbortSignal }
        )
      } catch (abortError: unknown) {
        clearTimeout(timeoutId)
        const err = abortError instanceof Error ? abortError : new Error(String(abortError))
        const isAbort =
          err.name === 'AbortError' ||
          err.name === 'APIUserAbortError' ||
          err.message?.includes('aborted') ||
          err.message?.includes('Request was aborted')
        if (isAbort && !options._retry) {
          const baseTimeout = options.timeout ?? this.timeout
          const retryTimeout = Math.min(300000, baseTimeout * 2) // 2x timeout, cap 5 min
          console.warn('[CHATGPT] Request aborted (' + err.name + '), retrying once with timeout=' + retryTimeout + 'ms')
          return this.callChatGPT(prompt, {
            timeout: retryTimeout,
            max_completion_tokens: options.max_completion_tokens,
            _retry: true,
            responseFormat: options.responseFormat,
          })
        }
        throw abortError
      }

      clearTimeout(timeoutId)

      // Non-streaming response has choices
      const response = rawResponse as { choices: Array<{ message?: { content?: string; refusal?: string }; finish_reason?: string }> }
      const choice = response.choices[0]
      const content = choice?.message?.content || ''
      const refusal = choice?.message?.refusal
      const finishReason = choice?.finish_reason

      console.log(`[CHATGPT] Response received: ${content.length} chars, finish_reason: ${finishReason}`)

      if (refusal) {
        console.error(`[CHATGPT] API refused to generate content: ${refusal}`)
        throw new Error(`ChatGPT refused: ${refusal}`)
      }

      // Empty content + "length" = reasoning model used all tokens for thinking, no output yet.
      // Retry once with more room so we get actual content instead of wasting the first call.
      if (!content && finishReason === 'length' && !options._retry) {
        const retryMaxTokens = Math.max(maxTokens * 2, maxTokens + 2000)
        console.warn(`[CHATGPT] Empty content with finish_reason=length (reasoning tokens). Retrying once with max_completion_tokens=${retryMaxTokens}`)
        return this.callChatGPT(prompt, {
          timeout: options.timeout,
          max_completion_tokens: retryMaxTokens,
          _retry: true,
          responseFormat: options.responseFormat,
        })
      }

      if (!content) {
        console.error(`[CHATGPT] Empty response from API. Finish reason: ${finishReason}`)
        if (!options._retry) {
          console.error(`[CHATGPT] Full response:`, JSON.stringify(rawResponse, null, 2))
        }
      }

      return content
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`[CHATGPT] API call failed:`, error)
      throw error
    }
  }

  /**
   * Translate text to Bulgarian
   */
  async translate(text: string, targetLang: string = 'bg'): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text
    }

    const prompt = `Translate this text to Bulgarian using NATURAL, COMMONLY USED Bulgarian terminology.

IMPORTANT RULES:
- Use terms that native Bulgarians would actually use in everyday speech
- Avoid literal word-by-word translations
- Use commonly spoken Bulgarian, not overly formal or archaic terms
- Keep brand names, model numbers, and specifications EXACTLY as is

COMMON TOOL TERMS:
- Slotted/Flat screwdriver = Права/Плоска отвертка
- Phillips = Кръстата отвертка
- Hexagonal = Шестостенен
- Torx = Torx отвертка
- Allen key = Имбусов ключ
- Drill = Бормашина
- Saw = Трион
- Pliers = Клещи
- Wrench = Гаечен ключ
- Hammer = Чук

Text to translate:
${text}

Return ONLY the natural Bulgarian translation.

Bulgarian translation:`

    const response = await this.callChatGPT(prompt, { max_completion_tokens: 1000 })
    return this.cleanResponse(response)
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(texts: string[], targetLang: string = 'bg'): Promise<string[]> {
    const results: string[] = []
    
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        results.push(text)
        continue
      }
      
      try {
        const translated = await this.translate(text, targetLang)
        results.push(translated)
      } catch (error) {
        console.error(`[CHATGPT] Translation failed for text: ${text.substring(0, 50)}`, error)
        results.push(text) // Fallback to original
      }
    }
    
    return results
  }

  /**
   * Translate product title with brand awareness
   */
  async translateTitle(title: string, brandName?: string, targetLang: string = 'bg'): Promise<string> {
    if (!title || title.trim().length === 0) {
      return title
    }

    const brandInstruction = brandName 
      ? `IMPORTANT: Keep the brand name "${brandName}" EXACTLY as is. Do not translate it.`
      : ''

    const prompt = `Translate this product title to Bulgarian using NATURAL, COMMONLY USED Bulgarian terminology.

${brandInstruction}

CRITICAL TOOL TERMINOLOGY (do NOT confuse these):
- "Slotted screwdriver" → "Права отвертка" or "Плоска отвертка" (flat blade, NOT hexagonal)
- "Phillips screwdriver" → "Кръстата отвертка" (cross/star pattern)
- "Hexagonal/Hex" → "Шестостенен" or "Шестоъгълен" (6-sided)
- "Torx screwdriver" → "Torx отвертка" or "Звезда отвертка"
- "Pozidriv" → "Pozidriv отвертка"
- "Allen key/Hex key" → "Имбусов ключ" or "Шестостенен ключ"
- "Socket wrench" → "Тресчотка" or "Ключ с вложка"
- "Spanner/Wrench" → "Гаечен ключ"
- "Pliers" → "Клещи"
- "Wire cutters" → "Клещи за рязане"
- "Drill" → "Бормашина"
- "Drill bit" → "Свредло"
- "Hammer" → "Чук"
- "Saw" → "Трион"
- "Measuring tape" → "Ролетка"

GENERAL TERMINOLOGY:
- "CNC cutting machine" → "ЦНЦ машина"
- "laser welder" → "лазерна заварка"
- "3D printer" → "3D принтер"
- "power tool" → "електроинструмент"
- Keep technical specs as numbers/units (1200W, 24V, 5x150mm, etc.)
- Keep model numbers EXACTLY as is (EDL6251501, etc.)
- Keep color names in parentheses: (black) → (черен), (white) → (бял), (red) → (червен)

Product title:
${title}

Return ONLY the natural Bulgarian title that Bulgarian consumers would use.

Bulgarian title:`

    // Enough room for reasoning models (e.g. ~200 reasoning + output) and to avoid finish_reason: length
    const response = await this.callChatGPT(prompt, { max_completion_tokens: 800 })
    return this.cleanResponse(response)
  }

  /**
   * Generate a short SEO-friendly category description from the category path (name and parents).
   * Used for category_extension.description and seo_meta_description (same text).
   * Path is the full translated path e.g. "Гейминг" or "Гейминг/Подложки за мишка".
   * Returns 1–2 sentences, max ~160 chars, in the same language as the path.
   */
  async generateCategoryDescription(categoryPath: string): Promise<string> {
    if (!categoryPath || categoryPath.trim().length === 0) {
      return ''
    }
    const path = categoryPath.trim()
    const prompt = `Generate a SHORT SEO-friendly category description for an e-commerce store.

Category path (name and parent hierarchy): ${path}

RULES:
- Write 1–2 sentences only, max 160 characters total (suitable for meta description).
- Use the same language as the category path (e.g. Bulgarian if path is in Bulgarian).
- Describe what products or topics this category covers in a way that helps shoppers and search engines.
- No quotes, no prefix like "Description:" — output only the description text.

Category description:`
    try {
      const response = await this.callChatGPT(prompt, { max_completion_tokens: 300 })
      const cleaned = this.cleanResponse(response)
      return cleaned.length > 160 ? cleaned.slice(0, 157) + '...' : cleaned
    } catch (error) {
      console.error('[CHATGPT] generateCategoryDescription failed:', error)
      return ''
    }
  }

  /**
   * Analyze product images using vision model (GPT-4 Vision)
   */
  async analyzeProductImages(images: { url: string; alt?: string }[]): Promise<ImageAnalysisResult> {
    // Vision analysis would use GPT-4 Vision API
    // For now, return empty results (same as Ollama)
    console.warn('[CHATGPT] Vision analysis not yet implemented')
    
    return {
      features: [],
      colors: [],
      materials: [],
      textOnProduct: [],
      suggestedKeywords: []
    }
  }

  /**
   * Enhance product with AI
   */
  async enhanceProduct(input: ProductEnhancementInput): Promise<ProductEnhancementOutput> {
    // Basic enhancement (same as Ollama)
    const title = input.title
    const description = input.description || ''

    return {
      title,
      description,
      metadata: {
        meta_title: title.substring(0, 60),
        meta_description: description.substring(0, 160),
        og_title: title,
        og_description: description.substring(0, 200),
        og_image: input.images[0]?.url,
        keywords: []
      }
    }
  }

  /**
   * Extract metaTitle and metaDescription from truncated or malformed JSON (e.g. API cut off mid-string).
   */
  private extractMetaTagsFromPartial(
    response: string,
    productInfo: { productName: string; originalDescription: string }
  ): { metaTitle: string; metaDescription: string } | null {
    const trim = (s: string, max: number) => (s ?? '').trim().slice(0, max) || null
    let metaTitle: string | null = null
    let metaDescription: string | null = null
    const metaTitleMatch = response.match(/"metaTitle"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
    if (metaTitleMatch) metaTitle = trim(metaTitleMatch[1].replace(/\\"/g, '"'), 60)
    const metaDescMatch = response.match(/"metaDescription"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
    if (metaDescMatch) metaDescription = trim(metaDescMatch[1].replace(/\\"/g, '"'), 160)
    if (metaTitle == null && metaDescription == null) return null
    return {
      metaTitle: metaTitle || productInfo.productName.substring(0, 60),
      metaDescription: metaDescription || productInfo.originalDescription.substring(0, 160)
    }
  }

  /**
   * Generate meta tags using prompt template
   */
  async generateMetaTags(productInfo: {
    productName: string
    primaryKeyword: string
    secondaryKeywords: string[]
    originalDescription: string
  }): Promise<{ metaTitle: string; metaDescription: string }> {
    const prompt = loadPrompt('meta-tags', {
      productName: productInfo.productName,
      primaryKeyword: productInfo.primaryKeyword,
      secondaryKeywords: productInfo.secondaryKeywords.slice(0, 3).join(', '),
      originalDescription: productInfo.originalDescription.substring(0, 500)
    })

    // Higher token cap so reasoning models have room for thinking + full JSON (avoids truncation)
    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: 4096,
      timeout: 120000,
      responseFormat: 'json_object',
    })

    if (!response?.trim()) {
      console.error('[CHATGPT] Empty response from API for meta tags')
      return {
        metaTitle: productInfo.productName.substring(0, 60),
        metaDescription: productInfo.originalDescription.substring(0, 160)
      }
    }

    try {
      const parsed = JSON.parse(response)
      return {
        metaTitle: (parsed.metaTitle ?? '').toString().trim() || productInfo.productName.substring(0, 60),
        metaDescription: (parsed.metaDescription ?? '').toString().trim() || productInfo.originalDescription.substring(0, 160)
      }
    } catch {
      const fallback = this.extractMetaTagsFromPartial(response, productInfo)
      if (fallback) return fallback
      return {
        metaTitle: productInfo.productName.substring(0, 60),
        metaDescription: productInfo.originalDescription.substring(0, 160)
      }
    }
  }

  /**
   * Generate SEO-optimized product descriptions using prompt template
   */
  async generateProductDescription(productInfo: {
    productName: string
    features: string[]
    primaryKeyword: string
    secondaryKeywords: string[]
    targetAudience: string
    usps: string[]
    useCases: string[]
    originalDescription: string
    images: Array<{ tag: string; url: string }>
    targetWordCount: number
    targetWordCountMin: number
    targetWordCountMax: number
  }): Promise<{
    technicalSafeDescription: string
    seoEnhancedDescription: string
    shortDescription: string
  }> {
    const imageInstructions = productInfo.images.length > 0
      ? `Images to include: ${productInfo.images.length} images`
      : 'No images provided'

    const prompt = loadPrompt('product-description', {
      productName: productInfo.productName,
      features: productInfo.features.join(', '),
      primaryKeyword: productInfo.primaryKeyword,
      secondaryKeywords: productInfo.secondaryKeywords.join(', '),
      targetAudience: productInfo.targetAudience,
      usps: productInfo.usps.join(', '),
      useCases: productInfo.useCases.join(', '),
      originalDescription: productInfo.originalDescription,
      imageInstructions,
      imageCount: productInfo.images.length,
      targetWordCount: productInfo.targetWordCount,
      targetWordCountMin: productInfo.targetWordCountMin,
      targetWordCountMax: productInfo.targetWordCountMax
    })

    // Enough room so response isn't cut off (finish_reason: length). Reasoning models use tokens for
    // "thinking" then output; reserve headroom for both. ~1.3 tokens/word, buffer for JSON wrapper.
    const outputTokens = Math.ceil(productInfo.targetWordCount * 1.3 * 2)
    const reasoningHeadroom = 5000 // reasoning models can use 4k+ for thinking before output
    const maxCompletionTokens = Math.max(8000, outputTokens + reasoningHeadroom)

    console.log(`[CHATGPT] Generating description with target ${productInfo.targetWordCount} words, max_completion_tokens: ${maxCompletionTokens}`)
    
    // 4 min timeout so "length" retry (16k tokens) has time to complete
    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: maxCompletionTokens,
      timeout: 240000,
      responseFormat: 'json_object',
    })

    if (!response?.trim()) {
      console.error('[CHATGPT] Empty response from API for description')
      return {
        technicalSafeDescription: productInfo.originalDescription,
        seoEnhancedDescription: productInfo.originalDescription,
        shortDescription: productInfo.originalDescription.substring(0, 250)
      }
    }

    try {
      const parsed = JSON.parse(response)
      const technicalSafe = (parsed.technicalSafeDescription ?? '').toString().trim()
      const seoEnhanced = (parsed.seoEnhancedDescription ?? '').toString().trim()
      const shortDesc = (parsed.shortDescription ?? '').toString().trim()
      return {
        technicalSafeDescription: technicalSafe || productInfo.originalDescription,
        seoEnhancedDescription: seoEnhanced || technicalSafe || productInfo.originalDescription,
        shortDescription: shortDesc || productInfo.originalDescription.substring(0, 250)
      }
    } catch (error) {
      console.error('[CHATGPT] Failed to parse description response:', error)
      console.error('[CHATGPT] Response length:', response.length)
      console.error('[CHATGPT] First 500 chars:', response.substring(0, 500))
      return {
        technicalSafeDescription: productInfo.originalDescription,
        seoEnhancedDescription: productInfo.originalDescription,
        shortDescription: productInfo.originalDescription.substring(0, 250)
      }
    }
  }

  /**
   * Extract "What's Included" section
   */
  async extractIncludedSection(description: string): Promise<string | null> {
    const prompt = loadPrompt('extract-included', { description })

    // Enough room to avoid finish_reason: length (reasoning + HTML snippet)
    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: 4000,
      timeout: 60000
    })

    const cleaned = this.cleanResponse(response)
    
    if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.length < 10) {
      return null
    }

    return cleaned
  }

  /**
   * Extract technical specifications table
   */
  async extractSpecificationsTable(originalDescriptionEn: string): Promise<string | null> {
    const prompt = loadPrompt('extract-specifications', { originalDescriptionEn })

    // Enough room to avoid finish_reason: length (reasoning + specs table)
    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: 8000,
      timeout: 60000
    })

    const cleaned = this.cleanResponse(response)
    
    if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.length < 10) {
      return null
    }

    return cleaned
  }

  /**
   * COMPATIBILITY WRAPPERS - For backward compatibility with workflow
   * These methods maintain the same API as the old SEOOptimizationService
   */

  /**
   * Generate meta description (wrapper for generateMetaTags)
   */
  async generateMetaDescription(product: any, originalDescriptionEn?: string): Promise<{
    metaTitle: string
    metaDescription: string
  } | null> {
    try {
      const productInfo = {
        productName: product.title || 'Unknown',
        primaryKeyword: product.title || 'product',
        secondaryKeywords: [],
        originalDescription: originalDescriptionEn || product.description || ''
      }

      return await this.generateMetaTags(productInfo)
    } catch (error) {
      console.error('[CHATGPT] generateMetaDescription failed:', error)
      return null
    }
  }

  /**
   * Optimize description (wrapper for generateProductDescription)
   */
  async optimizeDescription(product: any, originalDescriptionEn?: string): Promise<{
    technicalSafeDescription: string
    seoEnhancedDescription: string
    shortDescription: string
  } | null> {
    try {
      // Calculate target word count based on original description
      const originalDesc = originalDescriptionEn || product.description || ''
      const originalWordCount = originalDesc.split(/\s+/).filter(word => word.length > 0).length
      
      // Target word count: same as original ±50 words, with min 150 (no max limit)
      const targetWordCount = Math.max(150, originalWordCount)
      const targetWordCountMin = Math.max(150, targetWordCount - 50)
      const targetWordCountMax = targetWordCount + 50

      info(`[ChatGPT] Original description: ${originalWordCount} words → Target: ${targetWordCount} words (${targetWordCountMin}-${targetWordCountMax})`)

      const productInfo = {
        productName: product.title || 'Unknown',
        features: [],
        primaryKeyword: product.title || 'product',
        secondaryKeywords: [],
        targetAudience: 'general consumers',
        usps: [],
        useCases: [],
        originalDescription: originalDesc,
        images: [],
        targetWordCount,
        targetWordCountMin,
        targetWordCountMax
      }

      const result = await this.generateProductDescription(productInfo)

      const generatedLength = result.seoEnhancedDescription.split(/\s+/).filter(word => word.length > 0).length
      info(`generatedLength: ${generatedLength}`)
      info(`originalWordCount: ${originalWordCount}`)
      info(`targetWordCount: ${targetWordCount}`)
      info(`targetWordCountMin: ${targetWordCountMin}`)
      info(`targetWordCountMax: ${targetWordCountMax}`)

      return result
    } catch (error) {
      console.error('[CHATGPT] optimizeDescription failed:', error)
      return null
    }
  }

  /**
   * Extract included items (wrapper for extractIncludedSection)
   */
  async extractIncludedItems(description: string): Promise<string | null> {
    return await this.extractIncludedSection(description)
  }

  /**
   * Extract technical data (wrapper for extractSpecificationsTable)
   */
  async extractTechnicalData(originalDescriptionEn: string): Promise<string | null> {
    return await this.extractSpecificationsTable(originalDescriptionEn)
  }
}
