/**
 * ChatGPT AI Service
 * Handles translation, vision analysis, and SEO optimization using OpenAI GPT-4o models
 * Drop-in replacement for OllamaService
 */

import { info } from 'console'
import OpenAI from 'openai'
import { loadPrompt } from '../utils/prompt-loader'

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
   * Make a request to OpenAI ChatGPT API
   */
  private async callChatGPT(
    prompt: string,
    options: {
      timeout?: number
      max_completion_tokens?: number
    } = {}
  ): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout)

    try {
      console.log(`[CHATGPT] Calling API with model: ${this.model}, max_completion_tokens: ${options.max_completion_tokens || 4000}`)
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: options.max_completion_tokens || 4000,
      }, {
        signal: controller.signal as any
      })

      clearTimeout(timeoutId)
      
      const choice = response.choices[0]
      const content = choice?.message?.content || ''
      const refusal = choice?.message?.refusal
      
      console.log(`[CHATGPT] Response received: ${content.length} chars, finish_reason: ${choice?.finish_reason}`)
      
      if (refusal) {
        console.error(`[CHATGPT] API refused to generate content: ${refusal}`)
        throw new Error(`ChatGPT refused: ${refusal}`)
      }
      
      if (!content) {
        console.error(`[CHATGPT] Empty response from API. Finish reason: ${choice?.finish_reason}`)
        console.error(`[CHATGPT] Full response:`, JSON.stringify(response, null, 2))
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

    const response = await this.callChatGPT(prompt, { max_completion_tokens: 200 })
    return this.cleanResponse(response)
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

    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: 500,
      timeout: 60000
    })

    // Parse JSON response
    try {
      const cleaned = this.cleanResponse(response)
      console.log(`[CHATGPT] Meta tags response (cleaned, ${cleaned.length} chars):`, cleaned.substring(0, 500))
      
      if (!cleaned) {
        console.error('[CHATGPT] Empty response from API for meta tags')
        return {
          metaTitle: productInfo.productName.substring(0, 60),
          metaDescription: productInfo.originalDescription.substring(0, 160)
        }
      }
      
      // Fix invalid JSON escapes before parsing
      const fixedJson = this.fixInvalidJsonEscapes(cleaned)
      
      const parsed = JSON.parse(fixedJson)
      return {
        metaTitle: parsed.metaTitle || '',
        metaDescription: parsed.metaDescription || ''
      }
    } catch (error) {
      console.error('[CHATGPT] Failed to parse meta tags response:', error)
      console.error('[CHATGPT] Raw response:', response.substring(0, 1000))
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

    // Calculate max_completion_tokens based on target word count
    // Roughly 1.3 tokens per word, with buffer for HTML and JSON
    const maxCompletionTokens = Math.max(4000, Math.ceil(productInfo.targetWordCount * 1.3 * 2))
    
    console.log(`[CHATGPT] Generating description with target ${productInfo.targetWordCount} words, max_completion_tokens: ${maxCompletionTokens}`)
    
    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: maxCompletionTokens,
      timeout: 180000 // 3 minutes
    })

    // Parse JSON response
    try {
      const cleaned = this.cleanResponse(response)
      console.log(`[CHATGPT] Description response (cleaned, ${cleaned.length} chars):`, cleaned.substring(0, 500))
      
      if (!cleaned) {
        console.error('[CHATGPT] Empty response from API for description')
        return {
          technicalSafeDescription: productInfo.originalDescription,
          seoEnhancedDescription: productInfo.originalDescription,
          shortDescription: productInfo.originalDescription.substring(0, 250)
        }
      }
      
      // Fix invalid JSON escapes before parsing
      const fixedJson = this.fixInvalidJsonEscapes(cleaned)
      console.log(`[CHATGPT] Fixed JSON (first 500 chars):`, fixedJson.substring(0, 500))
      
      const parsed = JSON.parse(fixedJson)
      return {
        technicalSafeDescription: parsed.technicalSafeDescription || '',
        seoEnhancedDescription: parsed.seoEnhancedDescription || '',
        shortDescription: parsed.shortDescription || ''
      }
    } catch (error) {
      console.error('[CHATGPT] Failed to parse description response:', error)
      console.error('[CHATGPT] Response length:', response.length)
      console.error('[CHATGPT] Cleaned response length:', this.cleanResponse(response).length)
      console.error('[CHATGPT] First 500 chars of cleaned response:', this.cleanResponse(response).substring(0, 500))
      console.error('[CHATGPT] Last 500 chars of raw response:', response.substring(Math.max(0, response.length - 500)))
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

    const response = await this.callChatGPT(prompt, {
      max_completion_tokens: 2000,
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
