// Vector search service using Cloudflare Vectorize
import type { Env } from '../types'
import { AIService } from './ai'
import { DatabaseService } from './database'

export interface SearchResult {
  articleId: string
  score: number
  title: string
  snippet: string
  category?: string
  publishedAt: string
}

export class VectorSearchService {
  private ai: AIService
  private db: DatabaseService

  constructor(private env: Env) {
    this.ai = new AIService(env)
    this.db = new DatabaseService(env)
  }

  /**
   * Search for articles similar to a query using vector similarity
   */
  async searchSimilarArticles(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.ai.generateEmbedding(query)

      // TODO: Implement Vectorize search once the API is stable
      // For now, use a hybrid approach with text search + stored embeddings
      
      // Fallback to text-based search for now
      const { articles } = await this.db.getArticles({ limit: limit * 3 })
      
      // Simple text matching as fallback
      const scoredResults = articles
        .map(article => ({
          articleId: article.id,
          score: this.calculateTextSimilarity(query.toLowerCase(), article),
          title: article.title,
          snippet: article.snippet,
          category: article.category,
          publishedAt: article.publishedAt
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return scoredResults
    } catch (error) {
      console.error('Vector search failed:', error)
      throw new Error('Failed to perform semantic search')
    }
  }

  /**
   * Find articles similar to a given article
   */
  async findSimilarArticles(articleId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const article = await this.db.getArticle(articleId)
      if (!article) {
        throw new Error('Article not found')
      }

      // Use the article's content as the search query
      const searchQuery = `${article.title} ${article.snippet}`
      const results = await this.searchSimilarArticles(searchQuery, limit + 1)
      
      // Remove the original article from results
      return results.filter(result => result.articleId !== articleId).slice(0, limit)
    } catch (error) {
      console.error('Similar articles search failed:', error)
      throw new Error('Failed to find similar articles')
    }
  }

  /**
   * Store article embedding in Vectorize (when API becomes available)
   */
  async storeArticleEmbedding(articleId: string): Promise<void> {
    try {
      const article = await this.db.getArticle(articleId)
      if (!article) {
        throw new Error('Article not found')
      }

      // Generate embedding
      const embedding = await this.ai.generateEmbedding(article.content)

      // Store in database for now (later can be moved to Vectorize)
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO article_embeddings (article_id, embedding, model, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        articleId,
        JSON.stringify(embedding),
        '@cf/baai/bge-large-en-v1.5',
        new Date().toISOString()
      ).run()

      // TODO: When Vectorize API is stable, also store in Vectorize:
      // await this.env.VECTORIZE.insert({
      //   id: articleId,
      //   values: embedding,
      //   metadata: {
      //     title: article.title,
      //     category: article.category,
      //     publishedAt: article.publishedAt
      //   }
      // })

    } catch (error) {
      console.error('Failed to store article embedding:', error)
      throw new Error('Failed to store article embedding')
    }
  }

  /**
   * Batch process articles to generate embeddings
   */
  async batchGenerateEmbeddings(limit: number = 50): Promise<{ processed: number; errors: number }> {
    try {
      // Get articles without embeddings
      const { results } = await this.env.DB.prepare(`
        SELECT a.id, a.title, a.content
        FROM articles a
        LEFT JOIN article_embeddings ae ON a.id = ae.article_id
        WHERE ae.article_id IS NULL
        AND a.is_archived = 0
        ORDER BY a.created_at DESC
        LIMIT ?
      `).bind(limit).all<{ id: string; title: string; content: string }>()

      let processed = 0
      let errors = 0

      // Process in small batches to avoid rate limits
      const BATCH_SIZE = 5
      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE)
        
        await Promise.allSettled(
          batch.map(async (article) => {
            try {
              await this.storeArticleEmbedding(article.id)
              processed++
            } catch (error) {
              console.error(`Failed to process article ${article.id}:`, error)
              errors++
            }
          })
        )

        // Small delay between batches
        if (i + BATCH_SIZE < results.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      return { processed, errors }
    } catch (error) {
      console.error('Batch embedding generation failed:', error)
      throw new Error('Failed to generate embeddings')
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalArticles: number
    articlesWithEmbeddings: number
    coverage: number
  }> {
    try {
      const [totalResult, embeddingsResult] = await Promise.all([
        this.env.DB.prepare('SELECT COUNT(*) as count FROM articles WHERE is_archived = 0').first<{ count: number }>(),
        this.env.DB.prepare('SELECT COUNT(*) as count FROM article_embeddings').first<{ count: number }>()
      ])

      const totalArticles = totalResult?.count || 0
      const articlesWithEmbeddings = embeddingsResult?.count || 0
      const coverage = totalArticles > 0 ? (articlesWithEmbeddings / totalArticles) * 100 : 0

      return {
        totalArticles,
        articlesWithEmbeddings,
        coverage: Math.round(coverage * 100) / 100
      }
    } catch (error) {
      console.error('Failed to get embedding stats:', error)
      return {
        totalArticles: 0,
        articlesWithEmbeddings: 0,
        coverage: 0
      }
    }
  }

  /**
   * Fallback text similarity calculation
   * This is a simple implementation and should be replaced with vector similarity
   */
  private calculateTextSimilarity(query: string, article: any): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/))
    const articleText = `${article.title} ${article.snippet} ${article.content}`.toLowerCase()
    const articleWords = new Set(articleText.split(/\s+/))

    // Calculate Jaccard similarity
    const intersection = new Set([...queryWords].filter(word => articleWords.has(word)))
    const union = new Set([...queryWords, ...articleWords])
    
    let similarity = intersection.size / union.size

    // Boost score for title matches
    if (article.title.toLowerCase().includes(query)) {
      similarity += 0.3
    }

    // Boost score for category matches
    if (article.category && article.category.toLowerCase().includes(query)) {
      similarity += 0.1
    }

    return Math.min(similarity, 1.0)
  }

  /**
   * Future method for when Vectorize API is fully available
   */
  async vectorizeSearch(queryEmbedding: number[], limit: number = 10): Promise<SearchResult[]> {
    try {
      // TODO: Implement when Vectorize search API is available
      // const results = await this.env.VECTORIZE.query({
      //   vector: queryEmbedding,
      //   topK: limit,
      //   returnMetadata: true
      // })
      
      // return results.matches.map(match => ({
      //   articleId: match.id,
      //   score: match.score,
      //   title: match.metadata.title,
      //   snippet: match.metadata.snippet,
      //   category: match.metadata.category,
      //   publishedAt: match.metadata.publishedAt
      // }))

      // For now, return empty array until API is available
      console.warn('Vectorize search not yet implemented - using fallback')
      return []
    } catch (error) {
      console.error('Vectorize search error:', error)
      return []
    }
  }
}