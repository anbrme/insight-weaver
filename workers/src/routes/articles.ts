import { Hono } from 'hono'
import type { Env } from '../types'
import { DatabaseService } from '../services/database'
import { AIService } from '../services/ai'
import { VectorSearchService } from '../services/vectorSearch'

export const articlesRouter = new Hono<{ Bindings: Env }>()

// GET /api/articles - Get articles with filtering
articlesRouter.get('/', async (c) => {
  try {
    const db = new DatabaseService(c.env)
    
    // Parse query parameters
    const category = c.req.query('category')
    const status = c.req.query('status')
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined
    const feedId = c.req.query('feedId')
    
    const result = await db.getArticles({
      category,
      status,
      limit,
      offset,
      feedId
    })
    
    return c.json(result)
  } catch (error) {
    console.error('Failed to get articles:', error)
    return c.json({
      error: 'Failed to fetch articles',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/articles/:id - Get specific article
articlesRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    const article = await db.getArticle(id)
    
    if (!article) {
      return c.json({ error: 'Article not found' }, 404)
    }
    
    return c.json(article)
  } catch (error) {
    console.error('Failed to get article:', error)
    return c.json({
      error: 'Failed to fetch article',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// PATCH /api/articles/:id - Update article
articlesRouter.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { isRead, isArchived, summary, analysis } = body
    
    const db = new DatabaseService(c.env)
    const updatedArticle = await db.updateArticle(id, {
      ...(isRead !== undefined && { isRead }),
      ...(isArchived !== undefined && { isArchived }),
      ...(summary !== undefined && { summary }),
      ...(analysis !== undefined && { analysis })
    })
    
    if (!updatedArticle) {
      return c.json({ error: 'Article not found' }, 404)
    }
    
    return c.json(updatedArticle)
  } catch (error) {
    console.error('Failed to update article:', error)
    return c.json({
      error: 'Failed to update article',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/articles/:id/summarize - Generate AI summary for article
articlesRouter.post('/:id/summarize', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    
    const article = await db.getArticle(id)
    if (!article) {
      return c.json({ error: 'Article not found' }, 404)
    }
    
    // Check if article already has a summary
    if (article.summary) {
      return c.json({ 
        summary: article.summary,
        cached: true 
      })
    }
    
    // Generate summary using AI
    const ai = new AIService(c.env)
    const summary = await ai.summarizeText(article.content)
    
    // Save summary to database
    await db.updateArticle(id, { summary })
    
    return c.json({ 
      summary,
      cached: false 
    })
  } catch (error) {
    console.error('Failed to summarize article:', error)
    return c.json({
      error: 'Failed to generate summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/articles/:id/embedding - Generate embedding for article (for semantic search)
articlesRouter.post('/:id/embedding', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    
    const article = await db.getArticle(id)
    if (!article) {
      return c.json({ error: 'Article not found' }, 404)
    }
    
    // Check if embedding already exists
    const existingEmbedding = await c.env.DB.prepare(
      'SELECT article_id FROM article_embeddings WHERE article_id = ?'
    ).bind(id).first()
    
    if (existingEmbedding) {
      return c.json({ 
        success: true, 
        cached: true,
        message: 'Embedding already exists'
      })
    }
    
    // Generate embedding using Cloudflare AI
    const ai = new AIService(c.env)
    const embedding = await ai.generateEmbedding(article.content)
    
    // Store embedding in database
    await c.env.DB.prepare(`
      INSERT INTO article_embeddings (article_id, embedding, model, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      id,
      JSON.stringify(embedding),
      '@cf/baai/bge-large-en-v1.5',
      new Date().toISOString()
    ).run()
    
    return c.json({ 
      success: true, 
      cached: false,
      message: 'Embedding generated and stored'
    })
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return c.json({
      error: 'Failed to generate embedding',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/articles/search - Semantic search for similar articles
articlesRouter.post('/search', async (c) => {
  try {
    const body = await c.req.json()
    const { query, limit = 10 } = body
    
    if (!query) {
      return c.json({
        error: 'Missing query',
        message: 'Query text is required'
      }, 400)
    }
    
    const vectorSearch = new VectorSearchService(c.env)
    const results = await vectorSearch.searchSimilarArticles(query, limit)
    
    return c.json({
      results,
      total: results.length,
      query
    })
  } catch (error) {
    console.error('Failed to search articles:', error)
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/articles/:id/similar - Find articles similar to a specific article
articlesRouter.get('/:id/similar', async (c) => {
  try {
    const id = c.req.param('id')
    const limit = parseInt(c.req.query('limit') || '5')
    
    const vectorSearch = new VectorSearchService(c.env)
    const results = await vectorSearch.findSimilarArticles(id, limit)
    
    return c.json({
      results,
      total: results.length,
      articleId: id
    })
  } catch (error) {
    console.error('Failed to find similar articles:', error)
    return c.json({
      error: 'Failed to find similar articles',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/articles/embeddings/batch - Generate embeddings for multiple articles
articlesRouter.post('/embeddings/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { limit = 50 } = body
    
    const vectorSearch = new VectorSearchService(c.env)
    const result = await vectorSearch.batchGenerateEmbeddings(limit)
    
    return c.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Generated embeddings for ${result.processed} articles with ${result.errors} errors`
    })
  } catch (error) {
    console.error('Failed to generate batch embeddings:', error)
    return c.json({
      error: 'Batch embedding generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/articles/embeddings/stats - Get embedding coverage statistics
articlesRouter.get('/embeddings/stats', async (c) => {
  try {
    const vectorSearch = new VectorSearchService(c.env)
    const stats = await vectorSearch.getEmbeddingStats()
    
    return c.json(stats)
  } catch (error) {
    console.error('Failed to get embedding stats:', error)
    return c.json({
      error: 'Failed to get embedding statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})