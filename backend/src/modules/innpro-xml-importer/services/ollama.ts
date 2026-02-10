/**
 * Unified Ollama AI Service
 * Handles translation, vision analysis, and SEO optimization using Ollama API
 */

import { info } from 'console'
import { loadPrompt } from '../utils/prompt-loader'

export interface OllamaConfig {
  baseUrl?: string
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

export class OllamaService {
  public readonly baseUrl: string
  protected model: string
  protected timeout: number

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '')
    this.model = config.model || process.env.OLLAMA_MODEL || 'gemma3:12b-it-qat' //'gemma3:latest'
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
    // Find the last closing brace that matches the opening brace
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

    return cleaned.trim()
  }

  /**
   * Make a request to Ollama API
   */
  private async callOllama(
    prompt: string,
    options: {
      timeout?: number
      num_ctx?: number
      num_predict?: number
      temperature?: number
    } = {}
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          num_ctx: options.num_ctx || 8192,
          num_predict: options.num_predict || 2000,
          temperature: options.temperature || 0.7,
        },
      }),
      signal: AbortSignal.timeout(options.timeout || this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.response || data.text || ''
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

    const response = await this.callOllama(prompt, { temperature: 0.3 })
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
        console.error(`[OLLAMA] Translation failed for text: ${text.substring(0, 50)}`, error)
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

    const response = await this.callOllama(prompt, { temperature: 0.3 })
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
      const response = await this.callOllama(prompt, { temperature: 0.5, num_predict: 300 })
      const cleaned = this.cleanResponse(response)
      return cleaned.length > 160 ? cleaned.slice(0, 157) + '...' : cleaned
    } catch (error) {
      console.error('[OLLAMA] generateCategoryDescription failed:', error)
      return ''
    }
  }

  /**
   * Convert image URL to base64
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  }

  /**
   * Analyze product images using vision model
   */
  async analyzeProductImages(images: { url: string; alt?: string }[]): Promise<ImageAnalysisResult> {
    if (!images || images.length === 0) {
      return {
        features: [],
        colors: [],
        materials: [],
        textOnProduct: [],
        suggestedKeywords: []
      }
    }

    // Take up to 3 images for analysis
    const imagesToAnalyze = images.slice(0, 3)
    
    try {
      // Convert images to base64
      const base64Images = await Promise.all(
        imagesToAnalyze.map(img => this.imageUrlToBase64(img.url))
      )

      const prompt = `Analyze these product images and extract:
1. Key visual features
2. Dominant colors
3. Materials visible
4. Any text/labels on product
5. Suggested SEO keywords

Return as JSON:
{
  "features": ["..."],
  "colors": ["..."],
  "materials": ["..."],
  "textOnProduct": ["..."],
  "suggestedKeywords": ["..."]
}`

      // Note: Vision analysis requires a vision-capable model
      // For now, return empty results
      // TODO: Implement vision analysis when vision model is available
      console.warn('[OLLAMA] Vision analysis not yet implemented')
      
      return {
        features: [],
        colors: [],
        materials: [],
        textOnProduct: [],
        suggestedKeywords: []
      }
    } catch (error) {
      console.error('[OLLAMA] Image analysis failed:', error)
      return {
        features: [],
        colors: [],
        materials: [],
        textOnProduct: [],
        suggestedKeywords: []
      }
    }
  }

  /**
   * Enhance product with AI
   */
  async enhanceProduct(input: ProductEnhancementInput): Promise<ProductEnhancementOutput> {
    // For now, return basic enhancement
    // Full implementation would use vision analysis + SEO optimization
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

    const response = await this.callOllama(prompt, {
      num_ctx: 8192,
      num_predict: 500,
      temperature: 0.7,
      timeout: 60000
    })

    // Parse JSON response
    try {
      const cleaned = this.cleanResponse(response)
      const parsed = JSON.parse(cleaned)
      return {
        metaTitle: parsed.metaTitle || '',
        metaDescription: parsed.metaDescription || ''
      }
    } catch (error) {
      console.error('[OLLAMA] Failed to parse meta tags response:', error)
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

    // Calculate required tokens based on target word count
    // Roughly 1.3 tokens per word, plus overhead for HTML and JSON structure
    const estimatedTokens = Math.ceil(productInfo.targetWordCount * 1.3 * 2.5) // 2.5x for safety
    const numPredict = Math.max(32000, estimatedTokens)
    
    console.log(`[OLLAMA] Generating description with target ${productInfo.targetWordCount} words, num_predict: ${numPredict}`)
    
    const response = await this.callOllama(prompt, {
      num_ctx: 124000,
      num_predict: numPredict,
      temperature: 0.7,
      timeout: 600000 // 10 minutes
    })

    // Parse JSON response
    try {
      const cleaned = this.cleanResponse(response)
      const parsed = JSON.parse(cleaned)
      return {
        technicalSafeDescription: parsed.technicalSafeDescription || '',
        seoEnhancedDescription: parsed.seoEnhancedDescription || '',
        shortDescription: parsed.shortDescription || ''
      }
    } catch (error) {
      console.error('[OLLAMA] Failed to parse description response:', error)
      console.error('[OLLAMA] Response length:', response.length)
      console.error('[OLLAMA] Cleaned response length:', this.cleanResponse(response).length)
      console.error('[OLLAMA] First 500 chars of cleaned response:', this.cleanResponse(response).substring(0, 500))
      console.error('[OLLAMA] Last 500 chars of cleaned response:', this.cleanResponse(response).substring(this.cleanResponse(response).length - 500))
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

    const response = await this.callOllama(prompt, {
      num_ctx: 124000,
      num_predict: 4000,
      temperature: 0.3,
      timeout: 120000
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

    const response = await this.callOllama(prompt, {
      num_ctx: 124000,
      num_predict: 8000,
      temperature: 0.3,
      timeout: 120000
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
      console.error('[OLLAMA] generateMetaDescription failed:', error)
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

      info(`[Ollama] Original description: ${originalWordCount} words → Target: ${targetWordCount} words (${targetWordCountMin}-${targetWordCountMax})`)

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
      console.error('[OLLAMA] optimizeDescription failed:', error)
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
