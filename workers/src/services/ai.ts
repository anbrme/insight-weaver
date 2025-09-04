// AI service for summarization and embeddings using Cloudflare Workers AI
import type { Env, EmbeddingResult, SummarizationResult } from '../types'

export class AIService {
  constructor(private env: Env) {}

  async summarizeText(text: string): Promise<string> {
    try {
      // Get system prompt from settings
      const systemPrompt = await this.getSystemPrompt()
      const maxTokens = await this.getMaxTokens()
      const temperature = await this.getTemperature()

      // Truncate text if it's too long (Cloudflare AI has input limits)
      const truncatedText = this.truncateText(text, 2000)

      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please summarize the following article:\n\n${truncatedText}`
          }
        ],
        max_tokens: maxTokens,
        temperature
      })

      if (response && typeof response === 'object' && 'response' in response) {
        return (response as any).response.trim()
      }

      throw new Error('Invalid AI response format')
    } catch (error) {
      console.error('AI summarization failed:', error)
      throw new Error('Failed to generate AI summary')
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate text for embedding (usually has stricter limits)
      const truncatedText = this.truncateText(text, 1000)

      const response = await this.env.AI.run('@cf/baai/bge-large-en-v1.5', {
        text: truncatedText
      })

      if (response && typeof response === 'object' && 'data' in response) {
        const embeddingResult = response as EmbeddingResult
        
        if (embeddingResult.data && embeddingResult.data.length > 0) {
          return embeddingResult.data[0]
        }
      }

      throw new Error('Invalid embedding response format')
    } catch (error) {
      console.error('AI embedding generation failed:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testText = "This is a test message to verify AI functionality."
      
      // Test summarization
      const summary = await this.summarizeText(testText)
      
      if (!summary || summary.length === 0) {
        throw new Error('AI returned empty response')
      }

      return {
        success: true,
        message: `AI connection successful. Test summary: "${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}"`
      }
    } catch (error) {
      return {
        success: false,
        message: `AI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async getSystemPrompt(): Promise<string> {
    try {
      const setting = await this.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ?'
      ).bind('ai_system_prompt').first<{ value: string }>()

      return setting?.value || `You are a factual, neutral geopolitical analyst. Your task is to summarize the following article. Extract only the key facts, policy statements, and strategic arguments. Avoid speculative language and journalistic flair. Present the summary as a series of bullet points. The summary must be concise and no more than 150 words.`
    } catch (error) {
      console.error('Failed to get system prompt from settings:', error)
      return 'Please provide a concise, factual summary of the following text.'
    }
  }

  private async getMaxTokens(): Promise<number> {
    try {
      const setting = await this.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ?'
      ).bind('ai_max_tokens').first<{ value: string }>()

      return setting ? parseInt(setting.value, 10) : 150
    } catch (error) {
      console.error('Failed to get max tokens from settings:', error)
      return 150
    }
  }

  private async getTemperature(): Promise<number> {
    try {
      const setting = await this.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ?'
      ).bind('ai_temperature').first<{ value: string }>()

      return setting ? parseFloat(setting.value) : 0.3
    } catch (error) {
      console.error('Failed to get temperature from settings:', error)
      return 0.3
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }

    // Try to find a good breaking point (end of sentence or paragraph)
    const truncated = text.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    const lastParagraph = truncated.lastIndexOf('\n')
    const lastSpace = truncated.lastIndexOf(' ')

    // Prefer breaking at sentence end
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1)
    }
    // Then paragraph break
    else if (lastParagraph > maxLength * 0.5) {
      return truncated.substring(0, lastParagraph)
    }
    // Finally word boundary
    else if (lastSpace > 0) {
      return truncated.substring(0, lastSpace)
    }
    // Hard truncate as last resort
    else {
      return truncated
    }
  }

  // Utility method for batch processing articles
  async batchSummarize(articleIds: string[]): Promise<{ [articleId: string]: string }> {
    const results: { [articleId: string]: string } = {}
    const BATCH_SIZE = 3 // Process a few at a time to avoid rate limits

    for (let i = 0; i < articleIds.length; i += BATCH_SIZE) {
      const batch = articleIds.slice(i, i + BATCH_SIZE)
      
      await Promise.allSettled(
        batch.map(async (articleId) => {
          try {
            const article = await this.env.DB.prepare(
              'SELECT content FROM articles WHERE id = ?'
            ).bind(articleId).first<{ content: string }>()

            if (article) {
              const summary = await this.summarizeText(article.content)
              results[articleId] = summary

              // Update the article with the summary
              await this.env.DB.prepare(
                'UPDATE articles SET summary = ? WHERE id = ?'
              ).bind(summary, articleId).run()
            }
          } catch (error) {
            console.error(`Failed to summarize article ${articleId}:`, error)
          }
        })
      )

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }
}