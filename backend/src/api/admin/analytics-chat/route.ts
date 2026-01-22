import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import AnalyticsMcpService from "../../../modules/analytics-mcp/service"

interface ChatRequest {
  message: string
  conversation_id?: string
  history?: Array<{ role: string; content: string }>
}

export const POST = async (
  req: MedusaRequest<ChatRequest>,
  res: MedusaResponse
) => {
  const { message, conversation_id, history = [] } = req.body || {}
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        message: "Message is required"
      })
    }

    // Create Analytics MCP service with query and logger from request scope
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const analyticsService = new AnalyticsMcpService({ query, logger })
    
    // Get available tools and convert to Ollama format
    const mcpTools = analyticsService.getTools()
    const tools = mcpTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
    
    // Prepare Ollama request
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_ANALYTICS_MODEL || 'qwen2.5:7b'
    
    logger.info(`[ANALYTICS CHAT] Processing message for conversation ${conversation_id || 'new'}`)
    
    // System prompt with examples
    const systemPrompt = `You are an AI analytics assistant for MS Commerce, an e-commerce platform.

CRITICAL: You MUST use the provided tools to get real data. NEVER make up, invent, or hallucinate any data.

Available tools:
- get_products: Get list of products
- get_product_by_id: Get specific product details
- get_orders: Get list of orders
- get_orders_by_period: Get orders in date range
- get_revenue_by_period: Get revenue for date range
- get_customers: Get customer list
- get_top_products: Get best selling products
- calculate_aov: Get average order value

STRICT RULES:
1. ONLY report data that comes from tool results - DO NOT add interpretations or assumptions
2. If tool returns 6 products, say "You have 6 products" - NOT "10 products" or any other number
3. Count the actual items in the tool response, don't use the "limit" parameter as the count
4. Present data in simple markdown tables showing ONLY the fields from the tool response
5. DO NOT describe products that aren't in the tool response
6. DO NOT make up product details, prices, or descriptions
7. If data is missing or null, say "Not available" - don't invent values
8. Always refer to the system as "MS Commerce"

Example:
User: "What products do I have?"
1. Call get_products with {"limit": 100}
2. Count the actual products returned (e.g., if 6 products returned, say "You have 6 products")
3. Show a table with: ID, Title, Status, Handle
4. DO NOT add details not in the response`

    // Build conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ]

    // Check Ollama availability
    try {
      const healthCheck = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET'
      })
      if (!healthCheck.ok) {
        throw new Error(`Ollama service unavailable: ${healthCheck.status}`)
      }
    } catch (error) {
      logger.error('[ANALYTICS CHAT] Ollama service check failed:', error)
      return res.status(503).json({
        message: "AI service is currently unavailable. Please try again later."
      })
    }

    // Call Ollama with function calling
    logger.info(`[ANALYTICS CHAT] Calling Ollama with ${tools.length} available tools`)
    logger.info(`[ANALYTICS CHAT] Tools being sent: ${tools.map(t => t.function?.name || 'unnamed').join(', ')}`)
    
    const ollamaRequest = {
      model: ollamaModel,
      messages,
      tools,
      stream: true, // Enable streaming
      options: {
        temperature: 0.1, // Very low temperature for factual, deterministic responses
      },
      // Enable thinking mode for better tool calling (deepseek-r1)
      think: false
    }
    
    logger.info(`[ANALYTICS CHAT] Request payload: ${JSON.stringify({ 
      model: ollamaRequest.model, 
      messageCount: messages.length,
      toolCount: tools.length 
    })}`)
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[ANALYTICS CHAT] Ollama API error: ${response.status} - ${errorText}`)
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Collect chunks to detect tool calls
    let fullMessage = { role: 'assistant', content: '', tool_calls: [] }
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    if (!reader) {
      throw new Error('No response body reader available')
    }

    let buffer = ''
    let hasToolCalls = false
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const chunk = JSON.parse(line)
          
          if (chunk.message) {
            if (chunk.message.content) {
              fullMessage.content += chunk.message.content
              // Stream content to client
              res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.message.content })}\n\n`)
            }
            
            if (chunk.message.tool_calls) {
              hasToolCalls = true
              fullMessage.tool_calls = chunk.message.tool_calls
            }
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
    
    logger.info(`[ANALYTICS CHAT] Ollama response - has tool_calls: ${hasToolCalls}`)
    logger.info(`[ANALYTICS CHAT] Ollama response - content length: ${fullMessage.content?.length || 0}`)
    if (fullMessage.tool_calls && fullMessage.tool_calls.length > 0) {
      logger.info(`[ANALYTICS CHAT] Tool calls count: ${fullMessage.tool_calls.length}`)
    }
    let assistantMessage = fullMessage

    // Handle function calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      logger.info(`[ANALYTICS CHAT] Processing ${assistantMessage.tool_calls.length} tool calls`)
      const toolResults = []
      
      for (const toolCall of assistantMessage.tool_calls) {
        logger.info(`[ANALYTICS CHAT] Tool call received: ${JSON.stringify(toolCall, null, 2)}`)
        
        // Handle both name-based and index-based tool calls
        let toolName = toolCall.function?.name
        
        // If name is empty but index is provided, look up tool by index
        if (!toolName && typeof toolCall.function?.index === 'number') {
          const toolIndex = toolCall.function.index
          if (toolIndex >= 0 && toolIndex < tools.length) {
            toolName = tools[toolIndex].function.name
            logger.info(`[ANALYTICS CHAT] Resolved tool from index ${toolIndex}: ${toolName}`)
          }
        }
        
        if (!toolName) {
          logger.error(`[ANALYTICS CHAT] Invalid tool call - missing function name and invalid index:`, toolCall)
          toolResults.push({
            role: "tool",
            content: JSON.stringify({ 
              error: "Invalid tool call - missing function name"
            }),
            tool_call_id: toolCall.id
          })
          continue
        }
        
        logger.info(`[ANALYTICS CHAT] Executing tool: ${toolName}`)
        
        try {
          const toolResult = await analyticsService.executeTool(
            toolName,
            toolCall.function.arguments
          )
          
          toolResults.push({
            role: "tool",
            tool_name: toolName,
            content: JSON.stringify(toolResult)
          })
          
          logger.info(`[ANALYTICS CHAT] Tool ${toolCall.function.name} executed successfully`)
        } catch (error) {
          logger.error(`[ANALYTICS CHAT] Tool execution failed:`, error)
          toolResults.push({
            role: "tool",
            tool_name: toolName,
            content: JSON.stringify({ 
              error: error instanceof Error ? error.message : "Unknown error"
            })
          })
        }
      }

      // Send tool results back to Ollama for final response with streaming
      logger.info(`[ANALYTICS CHAT] Sending tool results back to Ollama`)
      
      // Notify client that we're processing tool results
      res.write(`data: ${JSON.stringify({ type: 'tool_processing' })}\n\n`)
      
      const finalResponse = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            ...messages,
            assistantMessage,
            ...toolResults
          ],
          stream: true
        })
      })

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text()
        logger.error(`[ANALYTICS CHAT] Ollama final response error: ${finalResponse.status} - ${errorText}`)
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to get final response' })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      // Stream the final response
      const finalReader = finalResponse.body?.getReader()
      const finalDecoder = new TextDecoder()
      let finalBuffer = ''
      let finalContent = ''
      
      if (finalReader) {
        while (true) {
          const { done, value } = await finalReader.read()
          if (done) break
          
          finalBuffer += finalDecoder.decode(value, { stream: true })
          const lines = finalBuffer.split('\n')
          finalBuffer = lines.pop() || ''
          
          for (const line of lines) {
            if (!line.trim()) continue
            
            try {
              const chunk = JSON.parse(line)
              
              if (chunk.message?.content) {
                finalContent += chunk.message.content
                res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.message.content })}\n\n`)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      assistantMessage = { role: 'assistant', content: finalContent, tool_calls: [] }
    } else {
      // No tool calls, content was already streamed
    }

    // Generate conversation ID if not provided
    const conversationId = conversation_id || `conv_${Date.now()}`

    logger.info(`[ANALYTICS CHAT] Request completed successfully`)

    // Send final metadata and close stream
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      conversation_id: conversationId,
      timestamp: Date.now()
    })}\n\n`)
    res.end()

  } catch (error) {
    logger.error('[ANALYTICS CHAT] Error:', error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to process chat request"
    })
  }
}
