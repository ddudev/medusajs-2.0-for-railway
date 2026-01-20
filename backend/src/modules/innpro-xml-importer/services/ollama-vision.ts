/**
 * Ollama Vision Service
 * Handles product enhancement with AI vision capabilities
 */

import { OllamaTranslationServiceImpl } from './ollama-translation'

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

export interface ImageAnalysisResult {
  features: string[]
  colors: string[]
  materials: string[]
  textOnProduct: string[]
  suggestedKeywords: string[]
}

export class OllamaVisionService extends OllamaTranslationServiceImpl {
  /**
   * Convert image URL to base64
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      return buffer.toString('base64')
    } catch (error) {
      console.error(`[OLLAMA VISION] Failed to convert image to base64: ${url}`, error)
      throw error
    }
  }

  /**
   * Resize and compress image if needed (basic implementation)
   * For production, consider using sharp or similar library
   */
  private async optimizeImage(base64Image: string, maxSize: number = 1024): Promise<string> {
    // For now, just return the base64 image
    // In production, you might want to add actual resizing logic
    return base64Image
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

    const startTime = Date.now()
    
    // Take up to 5 images
    const imagesToAnalyze = images.slice(0, 5)
    
    try {
      // Convert images to base64
      const base64Images = await Promise.all(
        imagesToAnalyze.map(img => this.imageUrlToBase64(img.url))
      )

      const prompt = `Analyze these product images and extract the following information:

1. Key visual features (shape, design, structure)
2. Dominant colors
3. Materials visible in the images
4. Any text or labels on the product
5. Suggested keywords for SEO

Return your analysis in this exact JSON format:
{
  "features": ["feature1", "feature2", ...],
  "colors": ["color1", "color2", ...],
  "materials": ["material1", "material2", ...],
  "textOnProduct": ["text1", "text2", ...],
  "suggestedKeywords": ["keyword1", "keyword2", ...]
}

IMPORTANT: Return ONLY the JSON object, no other text.`

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          images: base64Images,
          stream: false,
          options: {
            num_ctx: 124000,
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(180000), // 3 minutes for image analysis
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.response?.trim() || '{}'
      
      // Try to extract JSON from response
      let analysisResult: ImageAnalysisResult
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        analysisResult = JSON.parse(cleanedResponse)
      } catch (parseError) {
        console.warn('[OLLAMA VISION] Failed to parse JSON response, using empty result')
        analysisResult = {
          features: [],
          colors: [],
          materials: [],
          textOnProduct: [],
          suggestedKeywords: []
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[OLLAMA VISION] Analyzed ${imagesToAnalyze.length} images in ${totalTime}ms`)
      
      return analysisResult
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error(`[OLLAMA VISION] Image analysis failed after ${totalTime}ms:`, error)
      
      // Return empty result on error
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
   * Generate SEO-optimized content based on product data and image analysis
   */
  async generateSEOContent(
    input: ProductEnhancementInput,
    imageAnalysis: ImageAnalysisResult
  ): Promise<ProductEnhancementOutput> {
    const startTime = Date.now()
    
    const descriptionLength = input.isComplex 
      ? '300-500 words with technical details, specifications, and use cases'
      : '100-200 words focusing on key benefits and features'
    
    const metaDescriptionLength = input.isComplex
      ? '155-160 characters'
      : '150-155 characters'

    // Build context from image analysis
    const imageContext = `
Image Analysis Results:
- Visual Features: ${imageAnalysis.features.join(', ') || 'N/A'}
- Colors: ${imageAnalysis.colors.join(', ') || 'N/A'}
- Materials: ${imageAnalysis.materials.join(', ') || 'N/A'}
- Text on Product: ${imageAnalysis.textOnProduct.join(', ') || 'N/A'}
- Suggested Keywords: ${imageAnalysis.suggestedKeywords.join(', ') || 'N/A'}
`

    const prompt = `You are an SEO expert for an e-commerce store. Generate optimized product content based on the following information:

Product Information:
- Title: ${input.title}
- Current Description: ${input.description || 'None'}
- Material: ${input.material || 'Not specified'}
- Subtitle: ${input.subtitle || 'None'}

${imageContext}

Product Complexity: ${input.isComplex ? 'Complex (technical product)' : 'Simple (consumer product)'}

Generate the following SEO-optimized content:

1. **Improved Title**: Optimize the product title for SEO (keep brand/model names, add key features)
2. **Description**: Write a compelling product description (${descriptionLength})
3. **Meta Title**: SEO meta title (50-60 characters, includes brand/key features)
4. **Meta Description**: SEO meta description (${metaDescriptionLength})
5. **Open Graph Title**: Social media title (optimized for sharing)
6. **Open Graph Description**: Social media description (compelling and shareable)
7. **Keywords**: 5-10 relevant SEO keywords

Return your response in this exact JSON format:
{
  "title": "improved product title",
  "description": "full product description here...",
  "meta_title": "SEO meta title",
  "meta_description": "SEO meta description",
  "og_title": "Open Graph title",
  "og_description": "Open Graph description",
  "keywords": ["keyword1", "keyword2", ...]
}

IMPORTANT: 
- Return ONLY the JSON object, no other text
- Ensure all text is properly escaped for JSON
- Keep meta_description within character limits
- Make content engaging and SEO-optimized`

    try {
      const timeout = input.isComplex ? 300000 : 120000 // 5 min for complex, 2 min for simple
      
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
            num_ctx: 124000,
            temperature: 0.8, // Slightly higher for creative content
          },
        }),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.response?.trim() || '{}'
      
      // Try to extract JSON from response
      let contentResult: any
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        contentResult = JSON.parse(cleanedResponse)
      } catch (parseError) {
        console.warn('[OLLAMA VISION] Failed to parse JSON response, using fallback')
        // Fallback to original content
        contentResult = {
          title: input.title,
          description: input.description || '',
          meta_title: input.title,
          meta_description: input.subtitle || input.title.substring(0, 160),
          og_title: input.title,
          og_description: input.subtitle || input.title,
          keywords: imageAnalysis.suggestedKeywords || []
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[OLLAMA VISION] Generated SEO content in ${totalTime}ms`)
      
      // Get primary image URL for og_image
      const ogImage = input.images.length > 0 ? input.images[0].url : undefined
      
      return {
        title: contentResult.title || input.title,
        description: contentResult.description || input.description || '',
        metadata: {
          meta_title: contentResult.meta_title || input.title,
          meta_description: contentResult.meta_description || '',
          og_title: contentResult.og_title || input.title,
          og_description: contentResult.og_description || '',
          og_image: ogImage,
          keywords: Array.isArray(contentResult.keywords) ? contentResult.keywords : []
        }
      }
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error(`[OLLAMA VISION] SEO content generation failed after ${totalTime}ms:`, error)
      
      // Return original content on error
      const ogImage = input.images.length > 0 ? input.images[0].url : undefined
      
      return {
        title: input.title,
        description: input.description || '',
        metadata: {
          meta_title: input.title,
          meta_description: input.subtitle || input.title.substring(0, 160),
          og_title: input.title,
          og_description: input.subtitle || input.title,
          og_image: ogImage,
          keywords: imageAnalysis.suggestedKeywords || []
        }
      }
    }
  }

  /**
   * Main method: Enhance product with vision analysis
   */
  async enhanceProductWithVision(input: ProductEnhancementInput): Promise<ProductEnhancementOutput> {
    const startTime = Date.now()
    
    console.log(`[OLLAMA VISION] Starting product enhancement for: ${input.title}`)
    console.log(`[OLLAMA VISION] Product complexity: ${input.isComplex ? 'Complex' : 'Simple'}`)
    console.log(`[OLLAMA VISION] Images to analyze: ${input.images.length}`)
    
    try {
      // Step 1: Analyze images
      const imageAnalysis = await this.analyzeProductImages(input.images)
      
      // Step 2: Generate SEO content based on analysis
      const enhancedContent = await this.generateSEOContent(input, imageAnalysis)
      
      const totalTime = Date.now() - startTime
      console.log(`[OLLAMA VISION] Product enhancement completed in ${totalTime}ms`)
      
      return enhancedContent
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error(`[OLLAMA VISION] Product enhancement failed after ${totalTime}ms:`, error)
      throw error
    }
  }
}

export default OllamaVisionService
