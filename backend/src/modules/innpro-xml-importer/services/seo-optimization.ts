/**
 * SEO Optimization Service
 * Generates SEO-optimized product descriptions using Ollama with the provided prompt template
 */

import { OllamaTranslationServiceImpl } from './ollama-translation'
import { MedusaProductData } from '../types'

export interface SEOOptimizedContent {
  metaTitle: string
  metaDescription: string
  technicalSafeDescription: string
  seoEnhancedDescription: string
  shortDescription: string
  includedItems?: string // "What's Included" section (HTML, translated to Bulgarian)
  specificationsTable?: string // Specifications table (HTML, translated to Bulgarian)
}

export class SEOOptimizationService {
  private ollamaService: OllamaTranslationServiceImpl
  private model: string
  private timeout: number

  constructor(
    ollamaService: OllamaTranslationServiceImpl,
    model: string = process.env.OLLAMA_MODEL || 'gemma3:latest',
    timeout: number = 600000 // 10 minutes for SEO generation
  ) {
    this.ollamaService = ollamaService
    this.model = model
    this.timeout = timeout
  }

  /**
   * Extract images from HTML description
   */
  private extractImagesFromDescription(description: string): Array<{ tag: string; url: string }> {
    if (!description) return []

    const images: Array<{ tag: string; url: string }> = []

    // Match <img> tags with various formats
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match
    while ((match = imgRegex.exec(description)) !== null) {
      images.push({
        tag: match[0], // Full img tag
        url: match[1], // Image URL
      })
    }

    return images
  }

  /**
   * Extract "Included" section from HTML description
   * Handles both HTML format and plain text format
   */
  private extractIncludedSection(description: string): string | null {
    if (!description) return null

    // Look for "Included" heading followed by a list
    // Common patterns: <h3>Included</h3> followed by <ul> or <p> with list items
    const includedPatterns = [
      // Pattern 1: <h3>Включено:</h3> or <h3>Включено</h3> followed by <ul>
      /<h3[^>]*>.*?[Вв]ключено[^<]*<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
      // Pattern 2: <h3>Included</h3> followed by <ul>
      /<h3[^>]*>Included<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
      // Pattern 3: <h3>Included</h3> followed by <p> with list items
      /<h3[^>]*>Included<\/h3>[\s\S]*?(<p[^>]*>[\s\S]*?<\/p>)/i,
      // Pattern 4: <h3>What's Included</h3> followed by <ul>
      /<h3[^>]*>What'?s?\s*Included<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
      // Pattern 5: Just <ul> with class containing "list" after "Included" text
      /<h3[^>]*>.*?Included.*?<\/h3>[\s\S]*?(<ul[^>]*class=["'][^"']*list[^"']*["'][^>]*>[\s\S]*?<\/ul>)/i,
    ]

    for (const pattern of includedPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        // Return the heading and list together
        const headingMatch = description.match(/(<h3[^>]*>.*?[Вв]ключено[^<]*<\/h3>)/i) ||
          description.match(/(<h3[^>]*>.*?Included.*?<\/h3>)/i)
        const heading = headingMatch ? headingMatch[1] : '<h3>Включено</h3>'
        return `${heading}\n${match[1]}`
      }
    }

    // Fallback: Look for plain text "Включено:" or "Included:" followed by list items
    const textIncludedPattern = /(?:^|\n)([Вв]ключено:|Included:)\s*\n((?:[-•*]\s*[^\n]+\n?)+)/i
    const textMatch = description.match(textIncludedPattern)
    if (textMatch && textMatch[2]) {
      // Convert text list to HTML
      const listItems = textMatch[2].split('\n')
        .filter(line => line.trim().match(/^[-•*]/))
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(item => item.length > 0)

      if (listItems.length > 0) {
        const heading = '<h3>Включено</h3>'
        const listHtml = '<ul>\n' + listItems.map(item => `  <li>${item}</li>`).join('\n') + '\n</ul>'
        return `${heading}\n${listHtml}`
      }
    }

    // Fallback: Look for <ul> with class="list-disc" or similar that appears after "Included" text
    const includedIndex = description.toLowerCase().indexOf('включено') !== -1
      ? description.toLowerCase().indexOf('включено')
      : description.toLowerCase().indexOf('included')
    if (includedIndex !== -1) {
      const afterIncluded = description.substring(includedIndex)
      const ulMatch = afterIncluded.match(/(<ul[^>]*class=["'][^"']*list[^"']*["'][^>]*>[\s\S]*?<\/ul>)/i)
      if (ulMatch) {
        const headingMatch = description.substring(0, includedIndex + 100).match(/(<h3[^>]*>.*?<\/h3>)/i)
        const heading = headingMatch ? headingMatch[1] : '<h3>Включено</h3>'
        return `${heading}\n${ulMatch[1]}`
      }
    }

    return null
  }

  /**
   * Extract specifications table from HTML description
   * Handles both HTML tables and text-based specifications with > prefix
   */
  private extractSpecificationsTable(description: string): string | null {
    if (!description) return null

    // First, try to find HTML table wrapper or table element
    const tablePatterns = [
      /<div[^>]*class=["'][^"']*table-wrapper[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<table[^>]*>([\s\S]*?)<\/table>/i,
    ]

    for (const pattern of tablePatterns) {
      const match = description.match(pattern)
      if (match && match[0]) {
        // Return the table HTML with wrapper if found
        return match[0]
      }
    }

    // Fallback: Look for text-based specifications with > prefix (like ">Производител\txTool")
    // This pattern matches lines starting with > followed by a label, tab/space, and value
    const textSpecPattern = /(?:^|\n)(>[^\n]+(?:\n>[^\n]+)*)/m
    const textSpecMatch = description.match(textSpecPattern)
    if (textSpecMatch && textSpecMatch[1]) {
      // Convert text-based specs to HTML table
      const specLines = textSpecMatch[1].split('\n').filter(line => line.trim().startsWith('>'))
      if (specLines.length > 0) {
        let tableHtml = '<table>\n<tbody>\n'
        for (const line of specLines) {
          // Parse line like ">Производител\txTool" or ">Производител xTool"
          const cleaned = line.replace(/^>\s*/, '').trim()
          const parts = cleaned.split(/\t+| {2,}/) // Split on tab or multiple spaces
          if (parts.length >= 2) {
            const label = parts[0].trim()
            const value = parts.slice(1).join(' ').trim()
            tableHtml += `  <tr>\n    <th>${label}</th>\n    <td>${value}</td>\n  </tr>\n`
          } else if (parts.length === 1 && cleaned.includes(' ')) {
            // Try splitting on first space if no tab
            const spaceIndex = cleaned.indexOf(' ')
            if (spaceIndex > 0) {
              const label = cleaned.substring(0, spaceIndex).trim()
              const value = cleaned.substring(spaceIndex + 1).trim()
              tableHtml += `  <tr>\n    <th>${label}</th>\n    <td>${value}</td>\n  </tr>\n`
            }
          }
        }
        tableHtml += '</tbody>\n</table>'
        return tableHtml
      }
    }

    return null
  }

  /**
   * Detect if product is technical (components, tools, industrial)
   */
  private isTechnicalProduct(product: MedusaProductData): boolean {
    const title = (product.title || '').toLowerCase()
    const category = (product.metadata?.category?.name || '').toLowerCase()
    const keywords = [
      'thermal paste', 'thermal compound', 'thermal grease',
      'cpu cooler', 'heatsink', 'thermal pad',
      'component', 'electronic component', 'pc component',
      'tool', 'industrial', 'professional',
      'solder', 'flux', 'adhesive',
    ]

    const combined = `${title} ${category}`.toLowerCase()
    return keywords.some(keyword => combined.includes(keyword))
  }

  /**
   * Extract product information for SEO prompt
   */
  private extractProductInfo(product: MedusaProductData, originalDescriptionEn?: string): {
    productName: string
    features: string[]
    primaryKeyword: string
    secondaryKeywords: string[]
    targetAudience: string
    usps: string[]
    useCases: string[]
    originalDescription: string
    images: Array<{ tag: string; url: string }>
    isTechnical: boolean
    includedSection?: string
    specificationsTable?: string
  } {
    const metadata = product.metadata || {}
    const parameters = metadata.parameters || []

    // Extract features from parameters
    const features: string[] = []
    if (product.material) features.push(`Material: ${product.material}`)
    if (product.weight) features.push(`Weight: ${product.weight}g`)
    if (product.length && product.width && product.height) {
      features.push(`Dimensions: ${product.length}x${product.width}x${product.height}mm`)
    }

    // Extract from parameters array
    if (Array.isArray(parameters)) {
      parameters.forEach((param: any) => {
        const paramName = param['@_name'] || param.name || ''
        const paramValue = param.value?.['@_name'] || param.value?.name || param.value || ''
        if (paramName && paramValue && !paramName.toLowerCase().includes('hide')) {
          features.push(`${paramName}: ${paramValue}`)
        }
      })
    }

    // Primary keyword - use product title (most SEO-relevant)
    // For SEO, the primary keyword should be the main product name/phrase
    // Extract meaningful keyword phrase from title (first 2-4 words typically)
    let primaryKeyword = 'product'
    if (product.title) {
      const titleWords = product.title.split(' ').filter(w => w.length > 0)
      // Use first 2-4 words as primary keyword (brand + product type)
      // Examples: "xTool Apparel Printer" -> "xTool Apparel Printer"
      //           "Thermal Paste 5g" -> "Thermal Paste"
      if (titleWords.length >= 2) {
        // Take first 2-3 words (usually brand + product type)
        primaryKeyword = titleWords.slice(0, Math.min(3, titleWords.length)).join(' ')
      } else if (titleWords.length === 1) {
        primaryKeyword = titleWords[0]
      }
    } else if (metadata.category?.name) {
      // Fallback to category name if no title
      primaryKeyword = metadata.category.name
    }

    // Secondary keywords - build comprehensive list for SEO
    const secondaryKeywords: string[] = []

    // Add brand/producer name (important for SEO)
    if (metadata.producer?.name) {
      secondaryKeywords.push(metadata.producer.name)
    }

    // Add category name (important for SEO)
    if (metadata.category?.name && metadata.category.name !== primaryKeyword) {
      secondaryKeywords.push(metadata.category.name)
    }

    // Add product type keywords from title (if not already primary keyword)
    if (product.title) {
      const titleWords = product.title.split(' ').filter(w => w.length > 0)
      // Add individual significant words from title (skip common words)
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'for', 'with', 'kit', 'set', 'combo']
      titleWords.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-zа-я0-9]/g, '')
        if (cleanWord.length > 2 && !commonWords.includes(cleanWord) && !secondaryKeywords.includes(word)) {
          secondaryKeywords.push(word)
        }
      })
    }

    // Add material (if relevant)
    if (product.material && product.material.length > 2) {
      secondaryKeywords.push(product.material)
    }

    // Add origin country (if relevant for SEO)
    if (product.origin_country && product.origin_country.length > 2) {
      secondaryKeywords.push(product.origin_country)
    }

    // Limit to top 8 secondary keywords for SEO focus
    const finalSecondaryKeywords = secondaryKeywords.slice(0, 8)

    // Target audience (infer from category)
    const categoryName = (metadata.category?.name || '').toLowerCase()
    let targetAudience = 'general consumers'
    if (categoryName.includes('gaming') || categoryName.includes('game')) {
      targetAudience = 'gamers'
    } else if (categoryName.includes('tool') || categoryName.includes('diy')) {
      targetAudience = 'DIYers'
    } else if (categoryName.includes('baby') || categoryName.includes('child')) {
      targetAudience = 'parents'
    } else if (categoryName.includes('pet')) {
      targetAudience = 'pet owners'
    }

    // USPs
    const usps: string[] = []
    if (metadata.warranty_name || metadata.warranty_period) {
      usps.push(`Warranty: ${metadata.warranty_name || metadata.warranty_period || 'Included'}`)
    }
    if (product.hs_code) {
      usps.push('Certified quality')
    }
    if (metadata.responsible_producer?.name) {
      usps.push(`Manufactured by ${metadata.responsible_producer.name}`)
    }

    // Use cases (extract from description or infer)
    const useCases: string[] = []
    if (originalDescriptionEn) {
      // Try to extract use cases from description
      const descLower = originalDescriptionEn.toLowerCase()
      if (descLower.includes('perfect for')) {
        const match = originalDescriptionEn.match(/perfect for ([^.]+)/i)
        if (match) useCases.push(match[1].trim())
      }
    }
    if (useCases.length === 0) {
      useCases.push('Everyday use')
      useCases.push('Professional applications')
    }

    // Extract images from original description
    const images = this.extractImagesFromDescription(originalDescriptionEn || '')

    // Extract included section and specifications table
    const includedSection = this.extractIncludedSection(originalDescriptionEn || '')
    const specificationsTable = this.extractSpecificationsTable(originalDescriptionEn || '')

    // Detect if product is technical
    const isTechnical = this.isTechnicalProduct(product)

    return {
      productName: product.title || 'Product',
      features: features.slice(0, 10), // Limit to 10 features
      primaryKeyword,
      secondaryKeywords: secondaryKeywords.slice(0, 5), // Limit to 5 keywords
      targetAudience,
      usps: usps.length > 0 ? usps : ['High quality', 'Reliable'],
      useCases: useCases.slice(0, 3), // Limit to 3 use cases
      originalDescription: originalDescriptionEn || '',
      images,
      isTechnical,
      includedSection,
      specificationsTable,
    }
  }

  /**
   * Build SEO prompt using the template
   */
  private buildSEOPrompt(productInfo: ReturnType<typeof this.extractProductInfo>): string {
    const {
      productName,
      features,
      primaryKeyword,
      secondaryKeywords,
      targetAudience,
      usps,
      useCases,
      originalDescription,
      images,
      includedSection,
      specificationsTable,
    } = productInfo

    // Build image instructions
    const imageInstructions = images.length > 0
      ? `\n\n🖼️ IMAGES TO PRESERVE - CRITICAL:
The original description contains ${images.length} image(s). You MUST include ALL of these images in BOTH descriptions (technicalSafeDescription AND seoEnhancedDescription) at appropriate, contextually relevant locations.

Image list:
${images.map((img, idx) => `${idx + 1}. ${img.tag}`).join('\n')}

CRITICAL IMAGE FORMATTING RULES:
- Use HTML <img> tags ONLY - DO NOT use markdown format like [text](url)
- Format: <img src="URL" alt="descriptive text" />
- Include ALL ${images.length} images in BOTH descriptions
- Place images contextually:
  * In technicalSafeDescription: After relevant paragraphs describing features they illustrate
  * In seoEnhancedDescription: After introduction or in sections where they add value
- Ensure images are placed where they make contextual sense (not all at the end)
- Keep the original <img> tags exactly as shown above
- If images are in markdown format, convert them to HTML <img> tags
- DO NOT skip any images - all ${images.length} must appear in both descriptions`
      : '\n\n⚠️ NOTE: If the original description contains images, you MUST extract and include them in both descriptions using HTML <img> tags.'

    return `Objective:
Rewrite and optimize the product description for "${productName}" by generating two separate versions of the content:
SEO-Enhanced Description – suitable for B2C product pages, optimized for Google search and conversions
Both versions must be 100% unique, written in Bulgarian, and derived from the same product data.

GLOBAL RULES
Generate ALL content in Bulgarian language
Do NOT use emojis
Do NOT exaggerate claims or promises
Do NOT invent specifications, guarantees, or certifications
Use natural language, no keyword stuffing
Return ONLY valid JSON, no explanations or extra text

PRODUCT INPUT DATA
Product Name: ${productName}
Product Features: ${features.join(', ')}
Primary Keyword: ${primaryKeyword}
Secondary Keywords: ${secondaryKeywords.join(', ')}
Target Audience: ${targetAudience}
USPs: ${usps.join(', ')}
Use Cases: ${useCases.join(', ')}
Original Description (English): ${originalDescription || 'Not provided'}
${imageInstructions}

🚨 CRITICAL EXTRACTION REQUIREMENTS - READ CAREFULLY 🚨

You MUST analyze the original description and extract the following sections:

1. "WHAT'S INCLUDED" / "INCLUDED" SECTION:
   - Look for sections titled "Included", "What's Included", "Включено", "Package Contents", "Contents", or similar
   - Extract the ENTIRE section including:
     * The heading (e.g., <h3>Включено:</h3>)
     * All list items (<ul>, <li>)
     * Any additional text or formatting
   - Translate ALL content to Bulgarian
   - Preserve the EXACT HTML structure
   - Return in "includedItems" field
   - DO NOT include in main descriptions

2. SPECIFICATIONS TABLE:
   - Look for tables, specification lists, or structured data showing product specs
   - Common patterns:
     * HTML <table> elements
     * Text-based specs with ">" prefix (e.g., ">Производител\txTool")
     * Lists with labels and values
   - Extract the ENTIRE table/specifications section
   - Translate ALL content to Bulgarian
   - Preserve the EXACT HTML structure (convert text-based specs to HTML table if needed)
   - Return in "specificationsTable" field
   - DO NOT include in main descriptions

${includedSection ? `\n\nPRE-EXTRACTED INCLUDED SECTION (for reference):\n${includedSection}\n\nNote: Even if this section was pre-extracted, you MUST still extract it from the original description and return it in includedItems.` : ''}
${specificationsTable ? `\n\nPRE-EXTRACTED SPECIFICATIONS TABLE (for reference):\n${specificationsTable}\n\nNote: Even if this table was pre-extracted, you MUST still extract it from the original description and return it in specificationsTable.` : ''}

⚠️ IMPORTANT: 
- ALWAYS check the original description for these sections, even if they weren't pre-extracted
- If these sections exist in the original description, you MUST extract and return them
- If they don't exist, you can omit the fields from JSON (they are optional)
- The main descriptions (technicalSafeDescription and seoEnhancedDescription) should be COMPLETE and detailed, but WITHOUT the "Included" section or specifications table

PART 1 – TECHNICAL-SAFE DESCRIPTION
(For innpro / B2B feeds)
Rules:
HTML ONLY
Use simple structure: <h3>, <p>, <ul>, <li>
Neutral, factual, technical tone
No CTA, no emotional language
Focus on what the product is, how it works, and where it is used
CRITICAL: DO NOT include the product title/name in the description - start directly with the description content
Required Structure:

<h3>Кратко техническо описание</h3>

<p>
Ясно и обективно описание на продукта, неговото предназначение
и основната му функция.
</p>

<h3>Основни характеристики</h3>
<ul>
  <li>Характеристика, описана технически</li>
  <li>Характеристика, описана технически</li>
  <li>Характеристика, описана технически</li>
</ul>

<h3>Приложение</h3>
<p>
Къде, как и за какви сценарии се използва продуктът.
</p>

[NOTE: Do NOT include "Included" section or specifications table here - they will be extracted separately]

PART 2 – SEO-ENHANCED DESCRIPTION
(For B2C product pages / Google SEO)
Rules:
HTML ONLY
SEO-optimized but natural
Benefits > features
Light emotional engagement, no hype
Include one soft CTA
CRITICAL: DO NOT include the product title/name in the description - start directly with the description content
Required Structure:

<p>
Въвеждащ параграф с ясно потребителско предимство
и естествено включване на основната ключова дума.
</p>

<h2>Основни предимства</h2>
<ul>
  <li>Полза за потребителя</li>
  <li>Подобрение в ежедневната употреба</li>
</ul>

<h2>Как се използва</h2>
<p>
Кратък реалистичен сценарий от ежедневието,
който показва стойността на продукта.
</p>

<h2>За кого е подходящ</h2>
<p>
Описание на целевата аудитория и ситуации на употреба.
</p>

<p>
Кратък, ненатрапчив призив за действие
(напр. „Разгледайте продукта", „Научете повече", „Поръчайте онлайн").
</p>

[NOTE: Do NOT include "Included" section or specifications table here - they will be extracted separately]

META DATA
(For SEO-Enhanced version only)
Meta Title
55–60 characters
Includes Primary Keyword
Clear, informative, benefit-oriented
Meta Description
150–155 characters
Summarizes main value
Encourages clicks without sales hype

SHORT DESCRIPTION
(Shared, but SEO-friendly)
150–250 characters
Neutral but attractive
Suitable for product cards and categories

FINAL EXTRACTION REMINDER
Before generating the JSON response, you MUST:
1. Re-read the original description carefully
2. Identify if there is a "What's Included" / "Included" section - if YES, extract it to includedItems
3. Identify if there is a specifications table or specs list - if YES, extract it to specificationsTable
4. Ensure these sections are NOT in the main descriptions
5. Make sure ALL images from the original description are included in BOTH main descriptions at appropriate locations

OUTPUT FORMAT (STRICT)
Return ONLY the following JSON object. DO NOT wrap it in markdown code blocks.
DO NOT repeat any content. Write each description ONCE only.

{
  "metaTitle": "...",
  "metaDescription": "...",
  "technicalSafeDescription": "...",
  "seoEnhancedDescription": "...",
  "shortDescription": "...",
  "includedItems": "...",  // OPTIONAL: "What's Included" section in HTML (translated to Bulgarian). Only include if present in original description.
  "specificationsTable": "..."  // OPTIONAL: Specifications table in HTML (translated to Bulgarian). Only include if present in original description.
}

CRITICAL REMINDER:
- Write each description ONCE - do not repeat paragraphs, sections, or content
- DO NOT include "Included" section or specifications table in the main descriptions
- Extract and return them separately in includedItems and specificationsTable fields
- Only include includedItems and specificationsTable if they exist in the original description
- Stop after writing the complete description - do not regenerate or repeat

JSON FORMATTING RULES
- All new lines in string values must be escaped as \\n
- All quotes in string values must be escaped as \\"
- All backslashes in string values must be escaped as \\\\
- HTML tags in descriptions should be properly escaped (e.g., <h3> stays as <h3>, but quotes inside HTML attributes must be escaped)
- No text before or after the JSON object
- No markdown code blocks around the JSON
- All content must be in Bulgarian language`
  }

  /**
   * Remove duplicate "Included" and "Specifications" sections from description
   * Also removes any repeated content blocks
   */
  private removeDuplicateSections(description: string): string {
    if (!description) return description

    // First, find all "Включено" or "Included" headings
    const includedPattern = /<h3[^>]*>.*?[Вв]ключено.*?<\/h3>/gi
    const includedMatches: Array<{ index: number; match: RegExpMatchArray }> = []
    let match: RegExpMatchArray | null
    while ((match = includedPattern.exec(description)) !== null) {
      if (match.index !== undefined) {
        includedMatches.push({ index: match.index, match })
      }
    }

    // If we have multiple "Included" sections, remove duplicates
    if (includedMatches.length > 1) {
      // Find the end of each "Included" section (until next major section or table)
      const sections: Array<{ start: number; end: number }> = []
      for (let i = 0; i < includedMatches.length; i++) {
        const start = includedMatches[i].index
        const afterStart = description.substring(start)

        // Find the end: next <h3> that's not "Включено", or <table>, or end of string
        const nextH3 = afterStart.match(/<h3[^>]*>(?!.*?[Вв]ключено)[^<]*<\/h3>/i)
        const nextTable = afterStart.match(/<table[^>]*>/i)
        const nextH2 = afterStart.match(/<h2[^>]*>/i)

        let end = description.length
        if (nextH3 && nextH3.index !== undefined) {
          end = start + nextH3.index
        } else if (nextTable && nextTable.index !== undefined) {
          end = start + nextTable.index
        } else if (nextH2 && nextH2.index !== undefined) {
          end = start + nextH2.index
        }

        sections.push({ start, end })
      }

      // Remove all but the first "Included" section (in reverse order)
      let cleaned = description
      for (let i = sections.length - 1; i > 0; i--) {
        cleaned = cleaned.substring(0, sections[i].start) + cleaned.substring(sections[i].end)
      }
      description = cleaned
    }

    // Find all specifications tables
    const tablePattern = /<table[^>]*>[\s\S]*?<\/table>/gi
    const tableMatches: Array<{ index: number; length: number }> = []
    while ((match = tablePattern.exec(description)) !== null) {
      if (match.index !== undefined) {
        tableMatches.push({ index: match.index, length: match[0].length })
      }
    }

    // If we have multiple tables, remove duplicates
    if (tableMatches.length > 1) {
      let cleaned = description
      // Remove all but the first table (in reverse order)
      for (let i = tableMatches.length - 1; i > 0; i--) {
        const table = tableMatches[i]
        cleaned = cleaned.substring(0, table.index) + cleaned.substring(table.index + table.length)
      }
      description = cleaned
    }

    // Additional cleanup: remove any obvious repeated blocks
    // Look for patterns like "Разгледайте нашия онлайн магазин" appearing multiple times
    const repeatedCTAPattern = /(Разгледайте нашия (онлайн магазин|сайт)[^<]*<\/p>[\s\S]*?){2,}/gi
    description = description.replace(repeatedCTAPattern, (match) => {
      // Keep only the first occurrence
      const firstMatch = match.match(/Разгледайте нашия (онлайн магазин|сайт)[^<]*<\/p>/i)
      return firstMatch ? firstMatch[0] : match
    })

    return description
  }

  /**
   * Remove product title from description if it appears at the beginning
   */
  private removeProductTitle(description: string, productTitle: string): string {
    if (!description || !productTitle) return description

    // Remove title if it appears at the very beginning (with optional HTML tags)
    // Pattern: <h1>Title</h1> or <h2>Title</h2> or <h3>Title</h3> or just "Title" at start
    const titlePatterns = [
      new RegExp(`^\\s*<h[1-3][^>]*>\\s*${this.escapeRegex(productTitle)}\\s*</h[1-3]>\\s*`, 'i'),
      new RegExp(`^\\s*${this.escapeRegex(productTitle)}\\s*[–-]\\s*`, 'i'),
      new RegExp(`^\\s*${this.escapeRegex(productTitle)}\\s*`, 'i'),
    ]

    let cleaned = description
    for (const pattern of titlePatterns) {
      cleaned = cleaned.replace(pattern, '')
    }

    // Also remove if title appears in first paragraph
    const firstParagraphMatch = cleaned.match(/^<p[^>]*>(.*?)<\/p>/i)
    if (firstParagraphMatch && firstParagraphMatch[1]) {
      const firstParaContent = firstParagraphMatch[1]
      if (firstParaContent.includes(productTitle)) {
        // Remove title from first paragraph
        const titleInPara = new RegExp(this.escapeRegex(productTitle) + '\\s*[–-]?\\s*', 'gi')
        const cleanedPara = firstParaContent.replace(titleInPara, '')
        cleaned = cleaned.replace(firstParagraphMatch[0], `<p>${cleanedPara}</p>`)
      }
    }

    return cleaned.trim()
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Check if all images are at the end of the description
   */
  private areImagesAtEnd(description: string, expectedImageCount: number): boolean {
    if (!description || expectedImageCount === 0) return false

    // Find all image tags
    const imageMatches = Array.from(description.matchAll(/<img[^>]+>/gi))
    if (imageMatches.length === 0) return false

    // Check if all images are in the last 30% of the content
    const lastImageIndex = imageMatches[imageMatches.length - 1].index || 0
    const contentLength = description.length
    const threshold = contentLength * 0.7 // Last 30% of content

    return lastImageIndex > threshold && imageMatches.length >= expectedImageCount * 0.8
  }

  /**
   * Redistribute images that are all at the end throughout the content
   * Simple approach: remove images, split by paragraphs, inject evenly
   */
  private redistributeImages(
    description: string,
    images: Array<{ tag: string; url: string }>,
    primaryKeyword: string
  ): string {
    if (!description || images.length === 0) return description

    // Remove all existing images from description
    let descriptionWithoutImages = description.replace(/<img[^>]+>/gi, '').trim()

    // Clean up multiple newlines
    descriptionWithoutImages = descriptionWithoutImages.replace(/\n{3,}/g, '\n\n')

    // Find all paragraph and heading closing tags as insertion points
    const insertionPoints: Array<{ index: number; type: 'paragraph' | 'heading' }> = []

    // Find all </p> tags
    const paragraphMatches = Array.from(descriptionWithoutImages.matchAll(/<\/p>/gi))
    paragraphMatches.forEach(match => {
      if (match.index !== undefined) {
        insertionPoints.push({ index: match.index + 4, type: 'paragraph' })
      }
    })

    // Find all </h2> and </h3> tags
    const headingMatches = Array.from(descriptionWithoutImages.matchAll(/<\/h2>|<\/h3>/gi))
    headingMatches.forEach(match => {
      if (match.index !== undefined) {
        insertionPoints.push({ index: match.index + (match[0].length), type: 'heading' })
      }
    })

    // Sort insertion points by index
    insertionPoints.sort((a, b) => a.index - b.index)

    // Calculate spacing: distribute images evenly
    const spacing = insertionPoints.length > 0
      ? Math.max(1, Math.floor(insertionPoints.length / images.length))
      : 1

    // Build result with images inserted
    let result = descriptionWithoutImages
    let insertions = 0

    // Insert images in reverse order to maintain correct indices
    for (let i = insertionPoints.length - 1; i >= 0 && insertions < images.length; i--) {
      if (i % spacing === 0 || insertionPoints[i].type === 'heading') {
        const img = images[insertions]
        const filename = img.url.split('/').pop() || 'image'
        const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
        const altText = `${primaryKeyword} ${baseName}`
        const imageHtml = `\n<img src="${img.url}" alt="${altText}" />\n`

        const insertPos = insertionPoints[i].index
        result = result.substring(0, insertPos) + imageHtml + result.substring(insertPos)
        insertions++
      }
    }

    // If there are still images to place, distribute remaining ones
    if (insertions < images.length) {
      const remainingImages = images.slice(insertions)
      const remainingSpacing = insertionPoints.length > insertions
        ? Math.max(1, Math.floor((insertionPoints.length - insertions) / remainingImages.length))
        : 1

      for (let i = insertionPoints.length - 1; i >= 0 && insertions < images.length; i--) {
        if ((insertionPoints.length - 1 - i) % remainingSpacing === 0) {
          const img = images[insertions]
          const filename = img.url.split('/').pop() || 'image'
          const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
          const altText = `${primaryKeyword} ${baseName}`
          const imageHtml = `\n<img src="${img.url}" alt="${altText}" />\n`

          const insertPos = insertionPoints[i].index
          result = result.substring(0, insertPos) + imageHtml + result.substring(insertPos)
          insertions++
        }
      }
    }

    // If still have images, place them before the last paragraph
    if (insertions < images.length) {
      const lastParagraphIndex = result.lastIndexOf('</p>')
      if (lastParagraphIndex > 0) {
        const imagesHtml = images.slice(insertions).map(img => {
          const filename = img.url.split('/').pop() || 'image'
          const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
          const altText = `${primaryKeyword} ${baseName}`
          return `<img src="${img.url}" alt="${altText}" />\n`
        }).join('')

        result = result.substring(0, lastParagraphIndex + 4) + '\n' + imagesHtml + result.substring(lastParagraphIndex + 4)
      }
    }

    return result
  }

  /**
   * Inject missing images into description if AI didn't include them
   * Places images contextually after paragraphs
   */
  private injectMissingImages(
    description: string,
    images: Array<{ tag: string; url: string }>,
    primaryKeyword: string
  ): string {
    if (!description || images.length === 0) return description

    // Extract image URLs that are already in the description
    const existingImageUrls = new Set<string>()
    const existingImgMatches = description.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
    if (existingImgMatches) {
      existingImgMatches.forEach(match => {
        const urlMatch = match.match(/src=["']([^"']+)["']/i)
        if (urlMatch && urlMatch[1]) {
          existingImageUrls.add(urlMatch[1])
        }
      })
    }

    // Find images that are missing
    const missingImages = images.filter(img => !existingImageUrls.has(img.url))

    if (missingImages.length === 0) {
      return description // All images already present
    }

    console.log(`[OLLAMA DESC]   Injecting ${missingImages.length} missing images into description`)

    // Split description by closing tags to find insertion points
    // We'll inject images after paragraphs, but before the next section
    const parts: Array<{ content: string; isClosing: boolean }> = []
    let lastIndex = 0
    const tagRegex = /(<\/p>|<\/h2>|<\/h3>|<\/div>)/gi
    let match

    while ((match = tagRegex.exec(description)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ content: description.substring(lastIndex, match.index), isClosing: false })
      }
      parts.push({ content: match[0], isClosing: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < description.length) {
      parts.push({ content: description.substring(lastIndex), isClosing: false })
    }

    // Reconstruct description with images injected
    let result = ''
    let imageIndex = 0
    let paragraphCount = 0

    for (const part of parts) {
      result += part.content

      // After closing a paragraph/heading, inject an image every 2-3 paragraphs
      if (part.isClosing && imageIndex < missingImages.length) {
        paragraphCount++
        // Inject image after every 2nd paragraph or heading
        if (paragraphCount % 2 === 0 || part.content.match(/<\/h2>|<\/h3>/i)) {
          const img = missingImages[imageIndex]
          // Extract filename for alt text
          const filename = img.url.split('/').pop() || 'image'
          const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
          const altText = `${primaryKeyword} ${baseName}`
          result += `\n<img src="${img.url}" alt="${altText}" />\n`
          imageIndex++
        }
      }
    }

    // If there are still missing images, inject them before the last paragraph or at the end
    if (imageIndex < missingImages.length) {
      // Try to find a good insertion point (before last heading)
      const headingMatches = Array.from(result.matchAll(/<h2>|<h3>/gi))
      if (headingMatches.length > 0) {
        const lastHeading = headingMatches[headingMatches.length - 1]
        const insertPos = lastHeading.index || 0
        const beforeInsert = result.substring(0, insertPos)
        const afterInsert = result.substring(insertPos)
        const imagesHtml = missingImages.slice(imageIndex).map(img => {
          const filename = img.url.split('/').pop() || 'image'
          const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
          const altText = `${primaryKeyword} ${baseName}`
          return `<img src="${img.url}" alt="${altText}" />\n`
        }).join('')
        result = beforeInsert + imagesHtml + afterInsert
      } else {
        // Append at the end
        const imagesHtml = missingImages.slice(imageIndex).map(img => {
          const filename = img.url.split('/').pop() || 'image'
          const baseName = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/[_-]/g, ' ')
          const altText = `${primaryKeyword} ${baseName}`
          return `<img src="${img.url}" alt="${altText}" />\n`
        }).join('')
        result += '\n' + imagesHtml
      }
    }

    return result
  }

  /**
   * Clean description text to remove strange symbols and artifacts
   * Preserves HTML structure and formatting while removing problematic characters
   */
  private cleanDescription(text: string): string {
    if (!text) return text

    let cleaned = text.trim()

    // Remove zero-width and invisible characters
    cleaned = cleaned
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
      .replace(/[\u2028\u2029]/g, '\n') // Line/paragraph separators
      // Remove control chars except \n, \r, \t
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

    // Fix malformed HTML entities (but preserve valid ones)
    cleaned = cleaned.replace(/&(?![#\w]+;)/g, '&amp;')

    // Normalize whitespace (preserve HTML structure)
    cleaned = cleaned.replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines

    // Remove AI response artifacts (preserve HTML tags)
    const aiArtifacts = [
      /^Translation:\s*/i,
      /^Output:\s*/i,
      /^Result:\s*/i,
      /^Here is.*?:\s*/i,
      /^Превод:\s*/i,
      /^Резултат:\s*/i,
    ]

    for (const artifact of aiArtifacts) {
      cleaned = cleaned.replace(artifact, '')
    }

    // Preserve markdown code blocks - don't remove them
    // Markdown formatting (**, ##, etc.) should be preserved

    return cleaned.trim()
  }

  /**
   * Parse Ollama response to extract SEO content
   * Handles malformed JSON with control characters and markdown code blocks
   */
  private parseSEOResponse(response: string): SEOOptimizedContent | null {
    try {
      // Clean the response: remove markdown code blocks if present
      let cleanedResponse = response.trim()

      // Remove markdown code blocks more aggressively (handle various formats)
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      // Try to extract JSON object from response
      // Look for the first { and try to find matching }
      let jsonStart = cleanedResponse.indexOf('{')
      if (jsonStart === -1) {
        console.warn('No JSON object found in response')
        return null
      }

      // Find the matching closing brace
      let braceCount = 0
      let jsonEnd = -1
      for (let i = jsonStart; i < cleanedResponse.length; i++) {
        if (cleanedResponse[i] === '{') braceCount++
        if (cleanedResponse[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
      }

      if (jsonEnd === -1) {
        console.warn('Could not find matching closing brace - response may be truncated')

        // Try to extract partial JSON if response was truncated
        // Look for the last complete field we can find
        const partialJson = cleanedResponse.substring(jsonStart)

        // Try to extract what we can using regex fallback
        console.warn('Attempting to extract partial data from truncated response')
        const extractJsonValue = (key: string, text: string): string => {
          const multilineKeys = ['technicalSafeDescription', 'seoEnhancedDescription', 'fullDescription', 'includedItems', 'specificationsTable']
          if (multilineKeys.includes(key)) {
            const multilinePattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*(?:,|})|$)`, 'i')
            const multilineMatch = text.match(multilinePattern)
            if (multilineMatch && multilineMatch[1]) {
              return multilineMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
            }
          }
          const quotedPattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i')
          const quotedMatch = text.match(quotedPattern)
          if (quotedMatch && quotedMatch[1]) {
            return quotedMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
          }
          return ''
        }

        // Try to extract what we can
        const partialResult = {
          metaTitle: extractJsonValue('metaTitle', partialJson) || extractJsonValue('meta_title', partialJson),
          metaDescription: extractJsonValue('metaDescription', partialJson) || extractJsonValue('meta_description', partialJson),
          technicalSafeDescription: extractJsonValue('technicalSafeDescription', partialJson) || extractJsonValue('technical_safe_description', partialJson),
          seoEnhancedDescription: extractJsonValue('seoEnhancedDescription', partialJson) || extractJsonValue('seo_enhanced_description', partialJson) || extractJsonValue('fullDescription', partialJson),
          shortDescription: extractJsonValue('shortDescription', partialJson) || extractJsonValue('short_description', partialJson),
          includedItems: extractJsonValue('includedItems', partialJson) || extractJsonValue('included_items', partialJson),
          specificationsTable: extractJsonValue('specificationsTable', partialJson) || extractJsonValue('specifications_table', partialJson),
        }

        // If we got at least one description, return partial result
        if (partialResult.seoEnhancedDescription || partialResult.technicalSafeDescription) {
          console.warn('Using partial data from truncated response')
          return {
            metaTitle: this.cleanDescription(partialResult.metaTitle || ''),
            metaDescription: this.cleanDescription(partialResult.metaDescription || ''),
            technicalSafeDescription: this.cleanDescription(partialResult.technicalSafeDescription || ''),
            seoEnhancedDescription: this.cleanDescription(partialResult.seoEnhancedDescription || ''),
            shortDescription: this.cleanDescription(partialResult.shortDescription || ''),
            includedItems: partialResult.includedItems ? this.cleanDescription(partialResult.includedItems) : undefined,
            specificationsTable: partialResult.specificationsTable ? this.cleanDescription(partialResult.specificationsTable) : undefined,
          }
        }

        return null
      }

      let jsonStr = cleanedResponse.substring(jsonStart, jsonEnd)

      // Try to parse as-is first (Ollama might already have proper escaping)
      try {
        const parsed = JSON.parse(jsonStr)
        return {
          metaTitle: this.cleanDescription(parsed.metaTitle || ''),
          metaDescription: this.cleanDescription(parsed.metaDescription || ''),
          technicalSafeDescription: this.cleanDescription(parsed.technicalSafeDescription || ''),
          seoEnhancedDescription: this.cleanDescription(parsed.seoEnhancedDescription || ''),
          shortDescription: this.cleanDescription(parsed.shortDescription || ''),
          includedItems: parsed.includedItems ? this.cleanDescription(parsed.includedItems) : undefined,
          specificationsTable: parsed.specificationsTable ? this.cleanDescription(parsed.specificationsTable) : undefined,
        }
      } catch (firstParseError) {
        // If first parse fails, try to fix common issues
        console.warn('[OLLAMA SEO] First JSON parse attempt failed, trying to fix escaping issues')

        // Try to fix unescaped quotes in string values
        // This is a common issue where Ollama returns JSON with unescaped quotes inside strings
        try {
          // Use a state machine approach to properly escape quotes in JSON string values
          let fixedJson = ''
          let inString = false
          let escapeNext = false

          for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i]
            const prevChar = i > 0 ? jsonStr[i - 1] : ''

            if (escapeNext) {
              fixedJson += char
              escapeNext = false
              continue
            }

            if (char === '\\') {
              escapeNext = true
              fixedJson += char
              continue
            }

            if (char === '"' && prevChar !== '\\') {
              // Check if this is the start/end of a string value (not a key)
              // Look ahead to see if this is followed by ':'
              const nextNonWhitespace = jsonStr.substring(i + 1).match(/^\s*:/)
              if (nextNonWhitespace) {
                // This is a key, keep as-is
                inString = false
                fixedJson += char
              } else if (!inString) {
                // Starting a string value
                inString = true
                fixedJson += char
              } else {
                // Inside a string value - check if this is the end or an unescaped quote
                // Look ahead to see if this is followed by ',' or '}' (end of value)
                const afterQuote = jsonStr.substring(i + 1).trim()
                if (afterQuote.startsWith(',') || afterQuote.startsWith('}')) {
                  // This is the end of the string value
                  inString = false
                  fixedJson += char
                } else {
                  // This is an unescaped quote inside the value, escape it
                  fixedJson += '\\"'
                }
              }
            } else {
              fixedJson += char
            }
          }

          // Try parsing the fixed JSON
          const parsed = JSON.parse(fixedJson)
          console.log('[OLLAMA SEO] Successfully parsed JSON after fixing escaping')
          return {
            metaTitle: this.cleanDescription(parsed.metaTitle || ''),
            metaDescription: this.cleanDescription(parsed.metaDescription || ''),
            technicalSafeDescription: this.cleanDescription(parsed.technicalSafeDescription || ''),
            seoEnhancedDescription: this.cleanDescription(parsed.seoEnhancedDescription || ''),
            shortDescription: this.cleanDescription(parsed.shortDescription || ''),
            includedItems: parsed.includedItems ? this.cleanDescription(parsed.includedItems) : undefined,
            specificationsTable: parsed.specificationsTable ? this.cleanDescription(parsed.specificationsTable) : undefined,
          }
        } catch (secondParseError) {
          // If still failing, log and try manual extraction
          if (secondParseError instanceof Error) {
            const errorMatch = secondParseError.message.match(/position (\d+)/)
            if (errorMatch) {
              const position = parseInt(errorMatch[1])
              const start = Math.max(0, position - 200)
              const end = Math.min(jsonStr.length, position + 200)
              console.warn(`[OLLAMA SEO] JSON parse error at position ${position}`)
              console.warn(`[OLLAMA SEO] Problematic section: ${jsonStr.substring(start, end)}`)
            }
          }
          console.warn('[OLLAMA SEO] JSON parse failed after fixing, trying manual extraction')
        }
      }

      // Fallback: Try to extract values using regex patterns
      // Look for JSON-like patterns with quoted keys and values
      const extractJsonValue = (key: string, text: string): string => {
        // For multiline values (like descriptions), we need a different approach
        const multilineKeys = ['technicalSafeDescription', 'seoEnhancedDescription', 'fullDescription', 'includedItems', 'specificationsTable']
        if (multilineKeys.includes(key)) {
          // Try to find the value between quotes, handling multiline content
          // Match from "key": " to the closing " before the next key or }
          const multilinePattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,|})`, 'i')
          const multilineMatch = text.match(multilinePattern)
          if (multilineMatch && multilineMatch[1]) {
            // Unescape control characters
            return multilineMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
          }
        }

        // For single-line values, try standard patterns
        // Try quoted key with quoted value (handles escaped quotes)
        const quotedPattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i')
        const quotedMatch = text.match(quotedPattern)
        if (quotedMatch && quotedMatch[1]) {
          return quotedMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
        }

        // Try unquoted key with quoted value
        const unquotedPattern = new RegExp(`${key}\\s*[:=]\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i')
        const unquotedMatch = text.match(unquotedPattern)
        if (unquotedMatch && unquotedMatch[1]) {
          return unquotedMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
        }

        return ''
      }

      const result = {
        metaTitle: this.cleanDescription(extractJsonValue('metaTitle', cleanedResponse) || extractJsonValue('meta_title', cleanedResponse)),
        metaDescription: this.cleanDescription(extractJsonValue('metaDescription', cleanedResponse) || extractJsonValue('meta_description', cleanedResponse)),
        technicalSafeDescription: this.cleanDescription(extractJsonValue('technicalSafeDescription', cleanedResponse) || extractJsonValue('technical_safe_description', cleanedResponse)),
        seoEnhancedDescription: this.cleanDescription(extractJsonValue('seoEnhancedDescription', cleanedResponse) || extractJsonValue('seo_enhanced_description', cleanedResponse) || extractJsonValue('fullDescription', cleanedResponse)),
        shortDescription: this.cleanDescription(extractJsonValue('shortDescription', cleanedResponse) || extractJsonValue('short_description', cleanedResponse)),
        includedItems: extractJsonValue('includedItems', cleanedResponse) || extractJsonValue('included_items', cleanedResponse) ? this.cleanDescription(extractJsonValue('includedItems', cleanedResponse) || extractJsonValue('included_items', cleanedResponse)) : undefined,
        specificationsTable: extractJsonValue('specificationsTable', cleanedResponse) || extractJsonValue('specifications_table', cleanedResponse) ? this.cleanDescription(extractJsonValue('specificationsTable', cleanedResponse) || extractJsonValue('specifications_table', cleanedResponse)) : undefined,
      }

      // If we got at least one description, return the result
      if (result.seoEnhancedDescription || result.technicalSafeDescription) {
        return result
      }

      // Last resort: if the response looks like it's just the description, use it
      if (cleanedResponse.length > 100 && !cleanedResponse.includes('{')) {
        const cleanedDesc = this.cleanDescription(cleanedResponse)
        return {
          metaTitle: '',
          metaDescription: '',
          technicalSafeDescription: cleanedDesc,
          seoEnhancedDescription: cleanedDesc,
          shortDescription: cleanedDesc.substring(0, 250).trim(),
          includedItems: undefined,
          specificationsTable: undefined,
        }
      }

      return null
    } catch (error) {
      console.warn('Failed to parse SEO response:', error)
      console.warn('Response preview:', response.substring(0, 500))
      return null
    }
  }

  /**
   * Optimize description only (translate + SEO optimize)
   * This is the first call - focused on getting the best description
   */
  /**
   * Generate meta description (for search engine snippets)
   * Returns: metaTitle (50-60 chars) and metaDescription (150-180 chars)
   */
  async generateMetaDescription(product: MedusaProductData, originalDescriptionEn?: string): Promise<{
    metaTitle: string
    metaDescription: string
  } | null> {
    const startTime = Date.now()
    const productTitle = product.title || 'Unknown'

    try {
      const productInfo = this.extractProductInfo(product, originalDescriptionEn)

      const prompt = `Generate SEO meta title and meta description for this product in Bulgarian.

PRODUCT INFORMATION:
Product Name: ${productInfo.productName}
Primary Keyword: ${productInfo.primaryKeyword}
Secondary Keywords: ${productInfo.secondaryKeywords.slice(0, 3).join(', ')}
Original Description (English): ${productInfo.originalDescription.substring(0, 500)}...

REQUIREMENTS:

Meta Title (50-60 characters):
- MUST include Primary Keyword "${productInfo.primaryKeyword}" at the beginning or early in the title
- Include brand name if relevant
- Keep it natural and readable
- Format: "[Primary Keyword] - [Benefit/Feature] | [Brand/Store]"
- Example: "xTool Apparel Printer - Печат на Дрехи | Nez.bg"
- Count characters carefully - must be 50-60 characters

Meta Description (150-180 characters):
- MUST include Primary Keyword "${productInfo.primaryKeyword}" in the first 120 characters
- Include 1-2 secondary keywords naturally: ${productInfo.secondaryKeywords.slice(0, 2).join(', ')}
- Summarize main value proposition
- Include a benefit or use case
- End with a subtle call-to-action if space allows
- Format: "[Primary Keyword] - [Value proposition]. [Benefits]. [CTA]"
- Example: "xTool Apparel Printer - професионален печат на дрехи и текстил. Висококачествени отпечатъци върху всички тъкани. Поръчайте онлайн!"
- Count characters carefully - must be 150-180 characters

OUTPUT FORMAT (STRICT):
Return ONLY this JSON object:
{
  "metaTitle": "...",
  "metaDescription": "..."
}

CRITICAL:
- Return ONLY valid JSON, no explanations
- No text before or after the JSON
- No markdown code blocks
- Count characters accurately`

      console.log(`[OLLAMA META] Generating meta description for "${productTitle.substring(0, 50)}"`)

      const response = await fetch(`${this.ollamaService.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_ctx: 124000,
            num_predict: 2000, // Meta descriptions are short
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.response || data.text || ''

      // Parse JSON response
      let parsed: { metaTitle: string; metaDescription: string } | null = null
      try {
        let cleanedResponse = responseText.trim()
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()

        const jsonStart = cleanedResponse.indexOf('{')
        const jsonEnd = cleanedResponse.lastIndexOf('}')

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1)
          parsed = JSON.parse(jsonStr)
        }
      } catch (error) {
        console.warn(`[OLLAMA META] Failed to parse response: ${error instanceof Error ? error.message : 'Unknown'}`)
        return null
      }

      if (parsed && parsed.metaTitle && parsed.metaDescription) {
        console.log(`[OLLAMA META] ✅ Generated meta title: ${parsed.metaTitle.length} chars, meta description: ${parsed.metaDescription.length} chars`)
        return {
          metaTitle: this.cleanDescription(parsed.metaTitle),
          metaDescription: this.cleanDescription(parsed.metaDescription),
        }
      }

      return null
    } catch (error) {
      console.warn(`[OLLAMA META] ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown'}`)
      return null
    }
  }

  /**
   * Generate SEO-optimized product description (150-400 words)
   * This is the actual on-page product description, separate from meta description
   * Meta description is generated separately via generateMetaDescription()
   */
  async optimizeDescription(product: MedusaProductData, originalDescriptionEn?: string): Promise<{
    technicalSafeDescription: string
    seoEnhancedDescription: string
    shortDescription: string
  } | null> {
    const startTime = Date.now()
    const productTitle = product.title || 'Unknown'
    const descriptionLength = originalDescriptionEn?.length || 0

    try {
      const productInfo = this.extractProductInfo(product, originalDescriptionEn)
      const images = productInfo.images

      // Build focused prompt for description only
      const imageInstructions = images.length > 0
        ? `\n\n🖼️ CRITICAL: IMAGES TO PRESERVE - READ CAREFULLY
The original description contains ${images.length} image(s). You MUST include ALL of these images WITHIN the descriptions (technicalSafeDescription AND seoEnhancedDescription), NOT after them.

Image list with URLs:
${images.map((img, idx) => `${idx + 1}. ${img.tag}`).join('\n')}

CRITICAL IMAGE REQUIREMENTS:
1. Include ALL ${images.length} images WITHIN the description content, distributed throughout
2. Use HTML <img> tags ONLY - format: <img src="URL" alt="descriptive Bulgarian text with keywords" />
3. Place images CONTEXTUALLY WITHIN the text flow:
   - Place image IMMEDIATELY after the paragraph that describes what it shows
   - If describing a feature, place the relevant image right after that feature description
   - If describing a use case, place the relevant image right after that use case
   - Images should be PART OF the content flow, not separate from it
   - DO NOT place all images at the end - they must be integrated throughout
4. Keep the original image URLs exactly as shown above
5. Add descriptive alt text in Bulgarian that includes relevant keywords (e.g., "xTool Apparel Printer печат на дрехи")

CORRECT Example (image WITHIN content):
<p>Принтерът xTool Apparel Printer предлага висококачествен печат на всички видове тъкани.</p>
<img src="https://assets.innpro.pl/17943/23798/1.jpg" alt="xTool Apparel Printer печат на тениска" />
<p>С двуглав печатащ глава Epson I1600, устройството гарантира прецизни цветове...</p>
<img src="https://assets.innpro.pl/17943/23798/2.jpg" alt="xTool Apparel Printer печатаща глава детайл" />
<p>Автоматичната система за поддръжка осигурява оптимална работа...</p>

INCORRECT Example (images at end):
<p>Full description text...</p>
<p>More text...</p>
<img src="..." />
<img src="..." />
<img src="..." />`
        : '\n\n⚠️ NOTE: If the original description contains images, you MUST extract and include them WITHIN both descriptions using HTML <img> tags, placed contextually after relevant paragraphs.'

      // Determine target word count based on product complexity
      const isComplexProduct = productInfo.isTechnical ||
        originalDescriptionEn.length > 3000 ||
        productInfo.features.length > 5
      const targetWordCount = isComplexProduct ? '300-500 words' : '150-300 words'
      const targetWordCountMin = isComplexProduct ? 300 : 150
      const targetWordCountMax = isComplexProduct ? 500 : 300

      const prompt = `Objective:
Generate SEO-optimized product description for "${productInfo.productName}" in Bulgarian.

GLOBAL RULES
- Generate ALL content in Bulgarian language
- Do NOT use emojis
- Do NOT exaggerate claims
- Use natural language, no keyword stuffing
- Return ONLY valid JSON, no explanations
- CRITICAL: DO NOT include the product title/name in the description
- DO NOT include "What's Included" section or specifications table (these are extracted separately)

PRODUCT INPUT DATA
Product Name: ${productInfo.productName}
Product Features: ${productInfo.features.join(', ')}
Primary Keyword: ${productInfo.primaryKeyword}
Secondary Keywords: ${productInfo.secondaryKeywords.join(', ')}
Target Audience: ${productInfo.targetAudience}
USPs: ${productInfo.usps.join(', ')}
Use Cases: ${productInfo.useCases.join(', ')}
Original Description (English): ${productInfo.originalDescription}
${imageInstructions}

SEO-ENHANCED PRODUCT DESCRIPTION (ON-PAGE)
This is the MAIN product description that appears on the product page.

WORD COUNT REQUIREMENTS:
- Target: ${targetWordCount} (${targetWordCountMin}-${targetWordCountMax} words)
- Simple products: 150-300 words
- Complex/technical products: 300-500 words
- Focus on QUALITY over strict length - content must be valuable and clear
- NO filler content - every word should add value

CONTENT REQUIREMENTS:
- HTML format with proper structure
- Use <h2> headings for major sections (Основни предимства, Как се използва, За кого е подходящ, Технически характеристики, etc.)
- Use <p> for paragraphs, <ul>/<li> for lists
- Benefits > features (focus on what the product does for the user)
- Light emotional engagement (but keep it professional)
- Include one soft CTA at the end (e.g., "Поръчайте сега" or "Открийте повече")
- Scannable formatting: short paragraphs, bullet points, clear headings

KEYWORD INTEGRATION (Natural, NOT stuffed):
- Include Primary Keyword "${productInfo.primaryKeyword}" 3-5 times naturally throughout
- Include Secondary Keywords: ${productInfo.secondaryKeywords.slice(0, 3).join(', ')} where relevant
- Keywords should appear in:
  * First paragraph (at least once - this is critical for SEO)
  * Section headings (where natural)
  * Image alt text (include keywords in alt attributes)
  * Throughout content naturally (not forced)
- Maintain natural, readable Bulgarian - prioritize user experience

IMAGE PLACEMENT (CRITICAL - READ THIS CAREFULLY):
🚨 YOU MUST INCLUDE ALL ${images.length} IMAGES DISTRIBUTED THROUGHOUT THE DESCRIPTION 🚨
🚨 DO NOT PLACE ALL IMAGES AT THE END - THEY MUST BE INTEGRATED WITHIN THE CONTENT 🚨

REQUIREMENTS:
1. Include ALL ${images.length} images using HTML <img> tags
2. Place images CONTEXTUALLY - immediately after paragraphs that describe what they show
3. Each image should be relevant to the surrounding text
4. Use descriptive alt text with keywords: <img src="URL" alt="[Primary Keyword] [description]" />
5. Images are PART OF the content flow, not separate from it
6. DO NOT place all images at the end - distribute them throughout the description
7. Format: <img src="https://assets.innpro.pl/..." alt="descriptive text" />

CORRECT EXAMPLE (images distributed throughout):
<h2>Основни предимства</h2>
<p>Принтерът xTool Apparel Printer предлага висококачествен печат на всички видове тъкани.</p>
<img src="https://assets.innpro.pl/17943/23798/1.jpg" alt="xTool Apparel Printer печат на тениска" />
<p>С двуглав печатащ глава Epson I1600, устройството гарантира прецизни цветове и детайли.</p>
<img src="https://assets.innpro.pl/17943/23798/2.jpg" alt="xTool Apparel Printer печатаща глава" />
<h2>Технически характеристики</h2>
<p>Разделителната способност 720 × 1800 DPI гарантира най-висока острота.</p>
<img src="https://assets.innpro.pl/17943/23798/8.jpg" alt="xTool Apparel Printer DPI качество" />
<p>Автоматичната система за поддръжка осигурява оптимална работа.</p>
<img src="https://assets.innpro.pl/17943/23798/5.jpg" alt="xTool Apparel Printer поддръжка" />

INCORRECT EXAMPLE (images at end - DO NOT DO THIS):
<p>Full description text...</p>
<p>More text...</p>
<p>Even more text...</p>
<img src="..." />
<img src="..." />
<img src="..." />

⚠️ IF YOU PLACE ALL IMAGES AT THE END, THE DESCRIPTION WILL BE REJECTED ⚠️
⚠️ DISTRIBUTE IMAGES THROUGHOUT THE CONTENT - AFTER EVERY 2-3 PARAGRAPHS ⚠️

TECHNICAL-SAFE DESCRIPTION (For B2B feeds)
- HTML format: <h3>, <p>, <ul>, <li>
- Neutral, factual, technical tone
- No CTA, no emotional language
- Focus on what the product is, how it works, and where it is used
- Include all technical details and features
- MUST include ALL ${images.length} images at appropriate locations
- Length: Similar to or longer than original description

SHORT DESCRIPTION (For product cards/categories)
- 150-250 characters
- Include Primary Keyword naturally
- Neutral but attractive tone
- Summarize main value proposition

OUTPUT FORMAT (STRICT)
Return ONLY this JSON object:
{
  "technicalSafeDescription": "...",
  "seoEnhancedDescription": "...",
  "shortDescription": "..."
}

NOTE: Meta title and meta description are generated separately - do NOT include them here.

CRITICAL REMINDERS:
- SEO description must be ${targetWordCount} (${targetWordCountMin}-${targetWordCountMax} words) - count words carefully
- Include ALL ${images.length} images in BOTH descriptions using HTML <img> tags
- Place images contextually where they make sense (not all at the end)
- Translate ALL content from the original description to Bulgarian
- Focus on user benefits and value proposition
- Make content scannable with headings and bullet points

JSON FORMATTING RULES
- All new lines in string values must be escaped as \\n
- All quotes in string values must be escaped as \\"
- All backslashes must be escaped as \\\\
- No text before or after the JSON
- No markdown code blocks`

      console.log(`[OLLAMA DESC] Starting description optimization for "${productTitle.substring(0, 50)}"`)
      console.log(`[OLLAMA DESC]   Input description: ${descriptionLength} chars`)
      console.log(`[OLLAMA DESC]   Images to preserve: ${images.length}`)

      const fetchStartTime = Date.now()
      const response = await fetch(`${this.ollamaService.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_ctx: 124000,
            num_predict: 32000, // Increased to allow comprehensive descriptions with images
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.response || data.text || ''
      const fetchTime = Date.now() - fetchStartTime

      console.log(`[OLLAMA DESC]   HTTP fetch: ${(fetchTime / 1000).toFixed(1)}s`)
      console.log(`[OLLAMA DESC]   Response: ${responseText.length} chars`)

      // Debug: Log first 500 chars of response to see what we're getting
      if (responseText.length > 0) {
        const preview = responseText.substring(0, Math.min(500, responseText.length))
        console.log(`[OLLAMA DESC]   Response preview (first 500 chars): ${preview}`)
      }

      // Parse JSON response
      const parsed = this.parseDescriptionResponse(responseText)

      if (parsed) {
        // Log description lengths before cleaning
        console.log(`[OLLAMA DESC]   Parsed description lengths - SEO: ${parsed.seoEnhancedDescription?.length || 0} chars, Technical: ${parsed.technicalSafeDescription?.length || 0} chars`)

        // Validate: Ensure descriptions are not JSON structures
        const validateDescription = (desc: string | undefined, fieldName: string): string | undefined => {
          if (!desc || desc.length === 0) return desc

          // Check if it looks like a JSON structure (starts with "fieldName":)
          if (desc.trim().startsWith(`"${fieldName}"`) || desc.trim().startsWith(`"${fieldName.toLowerCase()}"`)) {
            console.warn(`[OLLAMA DESC]   WARNING: ${fieldName} appears to be a JSON structure, not content. Attempting to extract value...`)
            // Try to extract the actual value from the JSON structure
            const valueMatch = desc.match(/^"[^"]+"\s*:\s*"([\s\S]*)"\s*[,}]?/m)
            if (valueMatch && valueMatch[1]) {
              return valueMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
            }
            // If extraction fails, return empty to avoid storing JSON structure
            console.warn(`[OLLAMA DESC]   Could not extract value from JSON structure, returning empty`)
            return undefined
          }

          return desc
        }

        // Validate and clean descriptions
        const productName = product.title || ''
        if (parsed.seoEnhancedDescription) {
          parsed.seoEnhancedDescription = validateDescription(parsed.seoEnhancedDescription, 'seoEnhancedDescription')
          if (parsed.seoEnhancedDescription) {
            parsed.seoEnhancedDescription = this.removeProductTitle(parsed.seoEnhancedDescription, productName)
            // Check if images are included
            const imageCount = (parsed.seoEnhancedDescription.match(/<img[^>]+>/gi) || []).length
            console.log(`[OLLAMA DESC]   SEO description has ${imageCount} images (expected: ${images.length})`)
          }
        }
        if (parsed.technicalSafeDescription) {
          parsed.technicalSafeDescription = validateDescription(parsed.technicalSafeDescription, 'technicalSafeDescription')
          if (parsed.technicalSafeDescription) {
            parsed.technicalSafeDescription = this.removeProductTitle(parsed.technicalSafeDescription, productName)
            // Check if images are included
            const imageCount = (parsed.technicalSafeDescription.match(/<img[^>]+>/gi) || []).length
            console.log(`[OLLAMA DESC]   Technical description has ${imageCount} images (expected: ${images.length})`)
          }
        }

        // Final validation: Ensure at least one description is valid
        if (!parsed.seoEnhancedDescription && !parsed.technicalSafeDescription) {
          console.warn(`[OLLAMA DESC]   WARNING: Both descriptions are empty or invalid after validation`)
          throw new Error('Both descriptions are empty or invalid after validation')
        }

        // Log word count for SEO description
        if (parsed.seoEnhancedDescription) {
          const wordCount = parsed.seoEnhancedDescription.split(/\s+/).length
          console.log(`[OLLAMA DESC]   SEO description word count: ${wordCount} words`)

          // Check if images are missing or all at the end
          const imageCount = (parsed.seoEnhancedDescription.match(/<img[^>]+>/gi) || []).length
          const allImagesAtEnd = this.areImagesAtEnd(parsed.seoEnhancedDescription, images.length)

          if (imageCount < images.length && images.length > 0) {
            console.warn(`[OLLAMA DESC]   WARNING: Only ${imageCount} images found, expected ${images.length}. Injecting missing images...`)
            parsed.seoEnhancedDescription = this.injectMissingImages(
              parsed.seoEnhancedDescription,
              images,
              productInfo.primaryKeyword
            )
            const newImageCount = (parsed.seoEnhancedDescription.match(/<img[^>]+>/gi) || []).length
            console.log(`[OLLAMA DESC]   After injection: ${newImageCount} images in description`)
          } else if (allImagesAtEnd && images.length > 0) {
            console.warn(`[OLLAMA DESC]   WARNING: All images are at the end. Redistributing images throughout content...`)
            parsed.seoEnhancedDescription = this.redistributeImages(
              parsed.seoEnhancedDescription,
              images,
              productInfo.primaryKeyword
            )
            console.log(`[OLLAMA DESC]   Images redistributed throughout description`)
          }
        }

        console.log(`[OLLAMA DESC] ✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
        return {
          technicalSafeDescription: parsed.technicalSafeDescription,
          seoEnhancedDescription: parsed.seoEnhancedDescription,
          shortDescription: parsed.shortDescription,
        }
      }

      throw new Error('Failed to parse description response')
    } catch (error) {
      console.log(`[OLLAMA DESC] ❌ FAILED after ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      throw error
    }
  }

  /**
   * Extract "What's Included" section from description
   * This is the second call - extracts from the optimized description
   */
  async extractIncludedItems(description: string): Promise<string | null> {
    const startTime = Date.now()

    try {
      const prompt = `Extract the "What's Included" / "Included" / "Package Contents" section from this product description and translate it to Bulgarian.

Original Description (English):
${description}

INSTRUCTIONS:
1. Look for sections with these titles:
   - "What's Included"
   - "Included"
   - "Package Contents"
   - "Contents"
   - "Включено"
   - "Комплектът включва"
   - Or any heading followed by a list of items

2. Extract the ENTIRE section including:
   - The heading (e.g., <h3>Включено:</h3> or <h3>What's Included</h3>)
   - ALL list items (<ul>, <li> or plain text list)
   - Any additional text or formatting
   - If it's a plain text list, convert it to HTML format

3. Translate ALL content to Bulgarian:
   - Translate the heading to "Включено:" or "Какво е включено:"
   - Translate all item names to Bulgarian
   - Preserve technical terms and brand names

4. Preserve the EXACT HTML structure, or convert plain text to HTML if needed

5. If no "Included" section exists, return exactly: null

OUTPUT FORMAT:
Return ONLY the extracted HTML section in Bulgarian, or exactly "null" if not found.

Example output:
<h3>Включено:</h3>
<ul>
  <li>Принтер за облекло</li>
  <li>Автоматична станция за приложение</li>
  <li>Въздушен филтър</li>
</ul>`

      console.log(`[OLLAMA INCLUDED] Extracting included items from description (${description.length} chars)`)

      const fetchStartTime = Date.now()
      const response = await fetch(`${this.ollamaService.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_ctx: 124000,
            num_predict: 4000, // Small response for extraction
            temperature: 0.3, // Lower temperature for extraction
          },
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = (data.response || data.text || '').trim()
      const fetchTime = Date.now() - fetchStartTime

      console.log(`[OLLAMA INCLUDED]   HTTP fetch: ${(fetchTime / 1000).toFixed(1)}s`)
      console.log(`[OLLAMA INCLUDED]   Response: ${responseText.length} chars`)

      // Check if response is "null" or empty
      let trimmedResponse = responseText.trim()

      // Remove markdown code blocks if present
      trimmedResponse = trimmedResponse
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim()

      if (!trimmedResponse || trimmedResponse.toLowerCase() === 'null' || trimmedResponse.length < 10) {
        console.log(`[OLLAMA INCLUDED] ✅ No included items found`)
        return null
      }

      // Check if response looks like HTML (should contain <h3> or <ul> or <li>)
      if (!trimmedResponse.includes('<') && !trimmedResponse.includes('Включено') && !trimmedResponse.includes('включено')) {
        console.log(`[OLLAMA INCLUDED] ⚠️  Response doesn't look like HTML, might be invalid: ${trimmedResponse.substring(0, 50)}`)
        return null
      }

      // Clean and return
      const cleaned = this.cleanDescription(trimmedResponse)
      console.log(`[OLLAMA INCLUDED] ✅ Extracted ${cleaned.length} chars`)
      console.log(`[OLLAMA INCLUDED]   Preview: ${cleaned.substring(0, 150)}...`)
      return cleaned
    } catch (error) {
      console.log(`[OLLAMA INCLUDED] ❌ FAILED after ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      return null
    }
  }

  /**
   * Extract and translate technical data/specifications
   * This is the third call - extracts technical data from original description
   */
  async extractTechnicalData(originalDescriptionEn: string): Promise<string | null> {
    const startTime = Date.now()

    try {
      const prompt = `Extract the technical specifications/characteristics table from this product description and translate it to Bulgarian.

Original Description (English):
${originalDescriptionEn}

INSTRUCTIONS:
1. Find the specifications table or technical data section. Look for:
   - HTML <table> elements with specifications
   - Text-based specs with ">" prefix (e.g., ">Производитель\txTool" or ">Manufacturer\txTool")
   - Structured lists of key-value pairs
   - Sections labeled "Specifications", "Technical Data", "Characteristics", "Parameters"
   - Tables showing product specs in two columns (name/value)

2. Extract ALL specifications including:
   - Manufacturer/Brand
   - Model number
   - Dimensions (length, width, height)
   - Weight
   - Technical parameters (resolution, speed, capacity, etc.)
   - Operating conditions (temperature, humidity)
   - Power consumption
   - Any other technical details

3. Translate ALL content to Bulgarian:
   - Translate specification names (e.g., "Manufacturer" → "Производител")
   - Translate values when appropriate (keep technical terms and numbers as-is)
   - Preserve brand names and model numbers exactly

4. Convert to HTML table format:
   <table>
   <tbody>
   <tr><th>Specification Name (Bulgarian)</th><td>Value (translated if needed)</td></tr>
   </tbody>
   </table>

5. If no specifications found, return exactly: null

OUTPUT FORMAT:
Return ONLY the HTML table in Bulgarian, or exactly "null" if not found.

Example output:
<table>
<tbody>
<tr><th>Производител</th><td>xTool</td></tr>
<tr><th>Модел</th><td>XAP-AIO</td></tr>
<tr><th>Размери</th><td>905 × 365 × 356.5 мм</td></tr>
<tr><th>Тегло</th><td>34 кг</td></tr>
</tbody>
</table>`

      console.log(`[OLLAMA TECH] Extracting technical data from description (${originalDescriptionEn.length} chars)`)

      const fetchStartTime = Date.now()
      const response = await fetch(`${this.ollamaService.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_ctx: 124000,
            num_predict: 8000, // Medium response for specs table
            temperature: 0.3, // Lower temperature for accurate extraction
          },
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseText = (data.response || data.text || '').trim()
      const fetchTime = Date.now() - fetchStartTime

      console.log(`[OLLAMA TECH]   HTTP fetch: ${(fetchTime / 1000).toFixed(1)}s`)
      console.log(`[OLLAMA TECH]   Response: ${responseText.length} chars`)

      // Check if response is "null" or empty
      let trimmedResponse = responseText.trim()

      // Remove markdown code blocks if present
      trimmedResponse = trimmedResponse
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim()

      if (!trimmedResponse || trimmedResponse.toLowerCase() === 'null' || trimmedResponse.length < 10) {
        console.log(`[OLLAMA TECH] ✅ No technical data found`)
        return null
      }

      // Check if response looks like HTML table (should contain <table> or <tr> or <th> or <td>)
      if (!trimmedResponse.includes('<table') && !trimmedResponse.includes('<tr') && !trimmedResponse.includes('<th') && !trimmedResponse.includes('Производител') && !trimmedResponse.includes('Модел')) {
        console.log(`[OLLAMA TECH] ⚠️  Response doesn't look like a table, might be invalid: ${trimmedResponse.substring(0, 50)}`)
        return null
      }

      // Clean and return
      const cleaned = this.cleanDescription(trimmedResponse)
      console.log(`[OLLAMA TECH] ✅ Extracted ${cleaned.length} chars`)
      console.log(`[OLLAMA TECH]   Preview: ${cleaned.substring(0, 150)}...`)
      return cleaned
    } catch (error) {
      console.log(`[OLLAMA TECH] ❌ FAILED after ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      return null
    }
  }

  /**
   * Parse description-only response (no meta fields - those are generated separately)
   */
  private parseDescriptionResponse(response: string): {
    technicalSafeDescription: string
    seoEnhancedDescription: string
    shortDescription: string
  } | null {
    try {
      let cleanedResponse = response.trim()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      // Try to find JSON object
      let jsonStart = cleanedResponse.indexOf('{')
      if (jsonStart === -1) {
        console.warn('[OLLAMA DESC] No JSON object found in response')
        return null
      }

      // Find matching closing brace
      let braceCount = 0
      let jsonEnd = -1
      for (let i = jsonStart; i < cleanedResponse.length; i++) {
        if (cleanedResponse[i] === '{') braceCount++
        if (cleanedResponse[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
      }

      if (jsonEnd === -1) {
        console.warn('[OLLAMA DESC] Could not find matching closing brace')
        return null
      }

      let jsonStr = cleanedResponse.substring(jsonStart, jsonEnd)

      // Debug: Log JSON string length
      console.log(`[OLLAMA DESC]   Extracted JSON: ${jsonStr.length} chars`)

      // Try to parse
      try {
        const parsed = JSON.parse(jsonStr)

        // Debug: Log what we got from JSON.parse
        console.log(`[OLLAMA DESC]   JSON.parse success - Fields:`, {
          technicalSafeDescription: parsed.technicalSafeDescription?.substring(0, 50) || 'MISSING',
          seoEnhancedDescription: parsed.seoEnhancedDescription?.substring(0, 50) || 'MISSING',
          shortDescription: parsed.shortDescription?.substring(0, 50) || 'MISSING',
        })

        const result = {
          technicalSafeDescription: this.cleanDescription(parsed.technicalSafeDescription || ''),
          seoEnhancedDescription: this.cleanDescription(parsed.seoEnhancedDescription || ''),
          shortDescription: this.cleanDescription(parsed.shortDescription || ''),
        }

        // Debug: Log cleaned lengths and word counts
        const seoWordCount = result.seoEnhancedDescription ? result.seoEnhancedDescription.split(/\s+/).length : 0
        console.log(`[OLLAMA DESC]   After cleaning:`, {
          technicalSafeDescription: result.technicalSafeDescription.length,
          seoEnhancedDescription: `${result.seoEnhancedDescription.length} chars (${seoWordCount} words)`,
          shortDescription: result.shortDescription.length,
        })

        return result
      } catch (parseError: any) {
        console.warn(`[OLLAMA DESC] JSON.parse failed: ${parseError.message}`)
        console.warn(`[OLLAMA DESC] Attempting manual extraction...`)

        // Try manual extraction with better multiline support
        // For HTML content, we need to handle multiline strings that may contain escaped quotes
        const extractValue = (key: string): string => {
          // Strategy 1: Find the key, then find the opening quote, then find the matching closing quote
          // This handles multiline strings with escaped quotes properly
          const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, 'g')
          const keyMatch = jsonStr.match(keyPattern)

          if (keyMatch) {
            const keyIndex = jsonStr.indexOf(keyMatch[0])
            if (keyIndex !== -1) {
              // Start after the opening quote
              let startIndex = keyIndex + keyMatch[0].length
              let value = ''
              let i = startIndex
              let escapeNext = false

              // Parse character by character to handle escaped quotes correctly
              while (i < jsonStr.length) {
                const char = jsonStr[i]

                if (escapeNext) {
                  value += char
                  escapeNext = false
                } else if (char === '\\') {
                  value += char
                  escapeNext = true
                } else if (char === '"') {
                  // Check if this is the closing quote (next non-whitespace should be , or })
                  let j = i + 1
                  while (j < jsonStr.length && /\s/.test(jsonStr[j])) {
                    j++
                  }
                  if (j >= jsonStr.length || jsonStr[j] === ',' || jsonStr[j] === '}') {
                    // This is the closing quote
                    break
                  }
                  value += char
                } else {
                  value += char
                }
                i++
              }

              if (value.length > 0) {
                // Unescape the value
                const unescaped = value
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\')
                console.log(`[OLLAMA DESC]   Extracted ${key}: ${unescaped.length} chars (using character-by-character parsing)`)
                return unescaped
              }
            }
          }

          // Strategy 2: Try regex patterns (fallback)
          // Pattern for multiline strings (non-greedy, stops at unescaped quote followed by comma or brace)
          const multilinePattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.|\\\\n|\\\\r|\\\\t)*?)"(?=\\s*[,}])`, 'gs')
          let match = jsonStr.match(multilinePattern)

          if (match && match[1]) {
            const value = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
            console.log(`[OLLAMA DESC]   Extracted ${key}: ${value.length} chars (using regex)`)
            return value
          }

          console.warn(`[OLLAMA DESC]   Could not extract ${key} - key pattern: "${key}"`)
          return ''
        }

        const result = {
          technicalSafeDescription: this.cleanDescription(extractValue('technicalSafeDescription')),
          seoEnhancedDescription: this.cleanDescription(extractValue('seoEnhancedDescription')),
          shortDescription: this.cleanDescription(extractValue('shortDescription')),
        }

        const seoWordCount = result.seoEnhancedDescription ? result.seoEnhancedDescription.split(/\s+/).length : 0
        console.log(`[OLLAMA DESC]   Manual extraction result:`, {
          technicalSafeDescription: result.technicalSafeDescription.length,
          seoEnhancedDescription: `${result.seoEnhancedDescription.length} chars (${seoWordCount} words)`,
          shortDescription: result.shortDescription.length,
        })

        return result
      }
    } catch (error: any) {
      console.warn('[OLLAMA DESC] Failed to parse description response:', error.message)
      console.warn('[OLLAMA DESC] Response was:', response.substring(0, 200))
      return null
    }
  }

  /**
   * Generate SEO-optimized content for a product (LEGACY - kept for backward compatibility)
   * @deprecated Use optimizeDescription, extractIncludedItems, extractTechnicalData instead
   */
  async optimizeProduct(product: MedusaProductData, originalDescriptionEn?: string): Promise<SEOOptimizedContent | null> {
    const startTime = Date.now()
    const productTitle = product.title || 'Unknown'
    const descriptionLength = originalDescriptionEn?.length || 0

    try {
      // Extract product info
      const extractStartTime = Date.now()
      const productInfo = this.extractProductInfo(product, originalDescriptionEn)
      const extractTime = Date.now() - extractStartTime

      // Build prompt
      const promptStartTime = Date.now()
      const prompt = this.buildSEOPrompt(productInfo)
      const promptTime = Date.now() - promptStartTime

      // Estimate tokens (rough: ~4 chars per token)
      const estimatedPromptTokens = Math.ceil(prompt.length / 4)
      // Increase max response tokens to handle very long descriptions
      // With 124K context window, we can afford larger responses
      // Use 32K tokens for responses to ensure complete JSON even for complex products
      const maxResponseTokens = 32000

      console.log(`[OLLAMA SEO] Starting optimization for "${productTitle.substring(0, 50)}"`)
      console.log(`[OLLAMA SEO]   Input description: ${descriptionLength} chars`)
      console.log(`[OLLAMA SEO]   Extract product info: ${extractTime}ms`)
      console.log(`[OLLAMA SEO]   Build prompt: ${promptTime}ms (${prompt.length} chars, ~${estimatedPromptTokens} tokens)`)
      console.log(`[OLLAMA SEO]   Max response tokens: ${maxResponseTokens}`)

      // Call Ollama API for SEO optimization
      const ollamaStartTime = Date.now()
      console.log(`[OLLAMA SEO]   Starting Ollama API call...`)

      const fetchStartTime = Date.now()
      const response = await fetch(`${this.ollamaService.baseUrl}/api/generate`, {
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
            // Increase num_predict significantly to prevent truncation
            // For descriptions with HTML, we need more tokens
            num_predict: maxResponseTokens,
            // Increase temperature slightly for better quality (optional)
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      })
      const fetchEndTime = Date.now()
      const fetchTime = fetchEndTime - fetchStartTime

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      // Time the JSON parsing separately
      const parseStartTime = Date.now()
      const data = await response.json()
      const parseEndTime = Date.now()
      const parseTime = parseEndTime - parseStartTime

      const responseText = data.response || data.text || ''
      const ollamaFetchTime = parseEndTime - ollamaStartTime

      // Log fetch time with warnings
      const fetchSeconds = (fetchTime / 1000).toFixed(1)
      const totalSeconds = (ollamaFetchTime / 1000).toFixed(1)
      if (ollamaFetchTime > 300000) {
        console.log(`[OLLAMA SEO]   ⚠️  Total API call took ${totalSeconds}s (${(ollamaFetchTime / 60000).toFixed(1)} min) - VERY SLOW`)
      } else if (ollamaFetchTime > 120000) {
        console.log(`[OLLAMA SEO]   ⚠️  Total API call took ${totalSeconds}s (${(ollamaFetchTime / 60000).toFixed(1)} min) - SLOW`)
      } else {
        console.log(`[OLLAMA SEO]   HTTP fetch: ${fetchSeconds}s, JSON parse: ${(parseTime / 1000).toFixed(2)}s, Total: ${totalSeconds}s`)
      }

      // Extract metadata from Ollama response
      const totalDuration = data.total_duration ? (data.total_duration / 1000000000) : 0
      const loadDuration = data.load_duration ? (data.load_duration / 1000000000) : 0
      const evalCount = data.eval_count || 0
      const evalDuration = data.eval_duration ? (data.eval_duration / 1000000000) : 0
      const promptEvalCount = data.prompt_eval_count || 0
      const promptEvalDuration = data.prompt_eval_duration ? (data.prompt_eval_duration / 1000000000) : 0

      // Calculate timing differences
      // The "overhead" is the difference between HTTP fetch time and Ollama's reported total_duration
      // On localhost, this is NOT network latency - it's likely Ollama doing post-processing:
      // - Response serialization to JSON
      // - HTTP response preparation
      // - Buffering/queuing delays
      // Ollama's total_duration typically only measures model inference time, not response preparation
      const responsePrepOverhead = (fetchTime / 1000) - totalDuration
      const tokensPerSecond = evalCount > 0 && evalDuration > 0 ? (evalCount / evalDuration).toFixed(1) : 'N/A'

      // Check if response was truncated
      const isTruncated = data.done === false && responseText.length > 0
      const estimatedResponseTokens = Math.ceil(responseText.length / 4)

      console.log(`[OLLAMA SEO]   Response: ${responseText.length} chars (~${estimatedResponseTokens} tokens)${isTruncated ? ' ⚠️ TRUNCATED' : ''}`)
      if (totalDuration > 0) {
        console.log(`[OLLAMA SEO]   Ollama model inference: total=${totalDuration.toFixed(1)}s (load=${loadDuration.toFixed(1)}s, prompt_eval=${promptEvalCount} tokens in ${promptEvalDuration.toFixed(1)}s, eval=${evalCount} tokens in ${evalDuration.toFixed(1)}s = ${tokensPerSecond} tok/s)`)

        // Breakdown of where time is spent
        console.log(`[OLLAMA SEO]   Time breakdown:`)
        console.log(`[OLLAMA SEO]     - Model inference: ${totalDuration.toFixed(1)}s (${((totalDuration / (fetchTime / 1000)) * 100).toFixed(1)}% of total)`)
        if (responsePrepOverhead > 0.5) {
          console.log(`[OLLAMA SEO]     - Response prep (serialization/HTTP): ${responsePrepOverhead.toFixed(1)}s (${((responsePrepOverhead / (fetchTime / 1000)) * 100).toFixed(1)}% of total)`)
          console.log(`[OLLAMA SEO]     - JSON parsing: ${(parseTime / 1000).toFixed(2)}s`)

          // Explain the overhead on localhost
          if (responsePrepOverhead > 2) {
            console.log(`[OLLAMA SEO]     ⚠️  Note: On localhost, this overhead is likely Ollama's response serialization/formatting, not network latency`)
          }
        }
      } else {
        console.log(`[OLLAMA SEO]   ⚠️  Ollama did not report timing data`)
      }

      // Extract SEO content
      const seoParseStartTime = Date.now()
      const seoContent = this.parseSEOResponse(responseText)
      const seoParseTime = Date.now() - seoParseStartTime

      // Clean up duplicate sections and remove product title
      const cleanStartTime = Date.now()
      if (seoContent) {
        const productName = product.title || ''
        if (seoContent.seoEnhancedDescription) {
          seoContent.seoEnhancedDescription = this.removeDuplicateSections(seoContent.seoEnhancedDescription)
          seoContent.seoEnhancedDescription = this.removeProductTitle(seoContent.seoEnhancedDescription, productName)
        }
        if (seoContent.technicalSafeDescription) {
          seoContent.technicalSafeDescription = this.removeDuplicateSections(seoContent.technicalSafeDescription)
          seoContent.technicalSafeDescription = this.removeProductTitle(seoContent.technicalSafeDescription, productName)
        }
      }
      const cleanTime = Date.now() - cleanStartTime

      const totalTime = Date.now() - startTime

      // Summary log
      console.log(`[OLLAMA SEO]   Extract SEO content: ${seoParseTime}ms`)
      console.log(`[OLLAMA SEO]   Clean duplicates: ${cleanTime}ms`)
      console.log(`[OLLAMA SEO] ✅ Completed in ${(totalTime / 1000).toFixed(1)}s | Breakdown: extract=${extractTime}ms, prompt=${promptTime}ms, fetch=${ollamaFetchTime}ms (${(ollamaFetchTime / totalTime * 100).toFixed(1)}%), parse=${parseTime}ms, extract=${seoParseTime}ms, clean=${cleanTime}ms`)

      if (!seoContent || (!seoContent.seoEnhancedDescription && !seoContent.technicalSafeDescription)) {
        throw new Error('Failed to extract SEO content from response')
      }

      return seoContent
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.name : 'Unknown'

      console.log(`[OLLAMA SEO] ❌ FAILED after ${(totalTime / 1000).toFixed(1)}s`)
      console.log(`[OLLAMA SEO]   Error type: ${errorName}`)
      console.log(`[OLLAMA SEO]   Error message: ${errorMsg}`)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`SEO optimization timeout after ${this.timeout}ms (${(this.timeout / 60000).toFixed(1)} minutes)`)
      }
      throw error
    }
  }
}

export default SEOOptimizationService
