import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Load and fill prompt template from file
 * @param templateName Name of the template file (without .txt extension)
 * @param variables Object with variables to replace in template
 * @returns Filled prompt string
 */
export function loadPrompt(
  templateName: string,
  variables: Record<string, string | number | string[]>
): string {
  const templatePath = join(__dirname, '..', 'prompts', `${templateName}.txt`)
  let template = readFileSync(templatePath, 'utf-8')

  // Replace all variables in the format {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    const replacement = Array.isArray(value) ? value.join(', ') : String(value)
    template = template.replace(new RegExp(placeholder, 'g'), replacement)
  }

  return template
}
