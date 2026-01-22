/**
 * HTML Parsing Utilities
 * Common functions for extracting and manipulating HTML content
 */

/**
 * Extract specifications table from HTML description
 * Handles both HTML tables and text-based specifications with > prefix
 */
export function extractSpecificationsTable(description: string): string | null {
  if (!description) return null
  
  // First, try to find HTML table wrapper or table element
  const tablePatterns = [
    /<div[^>]*class=["'][^"']*table-wrapper[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<table[^>]*>([\s\S]*?)<\/table>/i,
  ]
  
  for (const pattern of tablePatterns) {
    const match = description.match(pattern)
    if (match && match[0]) {
      return match[0]
    }
  }
  
  // Fallback: Look for text-based specifications with > prefix (like ">Производител\txTool")
  const textSpecPattern = /(?:^|\n)(>[^\n]+(?:\n>[^\n]+)*)/m
  const textSpecMatch = description.match(textSpecPattern)
  if (textSpecMatch && textSpecMatch[1]) {
    const specLines = textSpecMatch[1].split('\n').filter(line => line.trim().startsWith('>'))
    if (specLines.length > 0) {
      let tableHtml = '<table>\n<tbody>\n'
      for (const line of specLines) {
        const cleaned = line.replace(/^>\s*/, '').trim()
        const parts = cleaned.split(/\t+| {2,}/) // Split on tab or multiple spaces
        if (parts.length >= 2) {
          const label = parts[0].trim()
          const value = parts.slice(1).join(' ').trim()
          tableHtml += `  <tr>\n    <th>${label}</th>\n    <td>${value}</td>\n  </tr>\n`
        } else if (parts.length === 1 && cleaned.includes(' ')) {
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
 * Extract "Included" section from HTML description
 * Handles both HTML format and plain text format
 */
export function extractIncludedSection(description: string): string | null {
  if (!description) return null
  
  // Look for "Included" heading followed by a list
  const includedPatterns = [
    /<h3[^>]*>.*?[Вв]ключено[^<]*<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
    /<h3[^>]*>Included<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
    /<h3[^>]*>What'?s?\s*Included<\/h3>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/i,
  ]
  
  for (const pattern of includedPatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
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
  
  // Additional check for "Included" section with class="list"
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
 * Extract images from HTML description
 */
export function extractImagesFromDescription(description: string): Array<{ tag: string; url: string }> {
  if (!description) return []

  const images: Array<{ tag: string; url: string }> = []
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
 * Remove product title from description to avoid duplication
 */
export function removeProductTitle(description: string, productTitle: string): string {
  if (!description || !productTitle) return description

  // Remove exact title match (case-insensitive)
  const titlePattern = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegex(productTitle)}\\s*<\\/h[1-6]>`, 'gi')
  let cleaned = description.replace(titlePattern, '')

  // Remove title if it appears at the start of a paragraph
  const titleAtStartPattern = new RegExp(`^\\s*${escapeRegex(productTitle)}\\s*[.:]?\\s*`, 'i')
  cleaned = cleaned.replace(titleAtStartPattern, '')

  return cleaned.trim()
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Clean HTML description by removing unwanted elements
 */
export function cleanDescription(html: string): string {
  if (!html) return html

  let cleaned = html.trim()

  // Remove script and style tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '')

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.replace(/>\s+</g, '><')

  return cleaned.trim()
}

/**
 * Check if all images are placed at the end of description
 */
export function areImagesAtEnd(description: string, imageCount: number): boolean {
  if (!description || imageCount === 0) return false

  // Find all image tags
  const imgMatches = description.match(/<img[^>]+>/gi)
  if (!imgMatches || imgMatches.length === 0) return false

  // Get the position of the last image
  const lastImgIndex = description.lastIndexOf('<img')
  
  // Get content after last image (excluding the image tag itself)
  const afterLastImage = description.substring(lastImgIndex)
  const afterImageContent = afterLastImage.replace(/<img[^>]+>/i, '').trim()

  // Remove closing tags and check if there's meaningful content
  const meaningfulContent = afterImageContent
    .replace(/<\/[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // If less than 50 chars after last image, images are likely at the end
  return meaningfulContent.length < 50
}

/**
 * Inject missing images into description
 */
export function injectMissingImages(
  description: string,
  images: Array<{ tag: string; url: string }>,
  primaryKeyword: string
): string {
  if (!description || images.length === 0) return description

  // Find existing images
  const existingImages = extractImagesFromDescription(description)
  const existingUrls = new Set(existingImages.map(img => img.url))

  // Find missing images
  const missingImages = images.filter(img => !existingUrls.has(img.url))
  if (missingImages.length === 0) return description

  // Split description into paragraphs
  const paragraphs = description.split(/(<\/p>|<\/h[1-6]>|<\/ul>|<\/ol>)/i)
  
  // Inject missing images after every 2-3 paragraphs
  let result = ''
  let imageIndex = 0
  let paragraphCount = 0

  for (let i = 0; i < paragraphs.length; i++) {
    result += paragraphs[i]
    
    // Check if this is a closing tag
    if (paragraphs[i].match(/<\/(p|h[1-6]|ul|ol)>/i)) {
      paragraphCount++
      
      // Inject image after every 2-3 paragraphs
      if (paragraphCount % 3 === 0 && imageIndex < missingImages.length) {
        const img = missingImages[imageIndex]
        result += `\n<img src="${img.url}" alt="${primaryKeyword}" />\n`
        imageIndex++
      }
    }
  }

  // Add any remaining images at the end
  while (imageIndex < missingImages.length) {
    const img = missingImages[imageIndex]
    result += `\n<img src="${img.url}" alt="${primaryKeyword}" />\n`
    imageIndex++
  }

  return result
}

/**
 * Redistribute images throughout description
 */
export function redistributeImages(
  description: string,
  images: Array<{ tag: string; url: string }>,
  primaryKeyword: string
): string {
  if (!description || images.length === 0) return description

  // Remove all existing images
  let cleaned = description.replace(/<img[^>]+>/gi, '')

  // Split into paragraphs
  const paragraphs = cleaned.split(/(<\/p>|<\/h[1-6]>|<\/ul>|<\/ol>)/i)
  
  // Distribute images evenly
  let result = ''
  let imageIndex = 0
  let paragraphCount = 0
  const imagesPerSection = Math.max(1, Math.floor(paragraphs.length / images.length / 2))

  for (let i = 0; i < paragraphs.length; i++) {
    result += paragraphs[i]
    
    if (paragraphs[i].match(/<\/(p|h[1-6]|ul|ol)>/i)) {
      paragraphCount++
      
      if (paragraphCount % imagesPerSection === 0 && imageIndex < images.length) {
        const img = images[imageIndex]
        result += `\n<img src="${img.url}" alt="${primaryKeyword}" />\n`
        imageIndex++
      }
    }
  }

  // Add any remaining images
  while (imageIndex < images.length) {
    const img = images[imageIndex]
    result += `\n<img src="${img.url}" alt="${primaryKeyword}" />\n`
    imageIndex++
  }

  return result
}
