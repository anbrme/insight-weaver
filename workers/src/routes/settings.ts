import { Hono } from 'hono'
import type { Env } from '../types'
import { AIService } from '../services/ai'

export const settingsRouter = new Hono<{ Bindings: Env }>()

// GET /api/settings - Get all settings
settingsRouter.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT key, value FROM settings
    `).all<{ key: string; value: string }>()

    // Convert flat settings to structured format
    const settings = results.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Structure the settings according to the frontend format
    const structuredSettings = {
      ai: {
        provider: settings.ai_provider || 'cloudflare',
        systemPrompt: settings.ai_system_prompt || 'You are a factual, neutral geopolitical analyst...',
        maxTokens: parseInt(settings.ai_max_tokens || '150', 10),
        temperature: parseFloat(settings.ai_temperature || '0.3'),
        ...(settings.ai_api_key && { apiKey: settings.ai_api_key }),
        ...(settings.ai_model && { model: settings.ai_model })
      },
      refreshInterval: parseInt(settings.refresh_interval || '30', 10),
      maxArticlesPerFeed: parseInt(settings.max_articles_per_feed || '50', 10)
    }

    return c.json(structuredSettings)
  } catch (error) {
    console.error('Failed to get settings:', error)
    return c.json({
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// PATCH /api/settings - Update settings
settingsRouter.patch('/', async (c) => {
  try {
    const body = await c.req.json()
    const { ai, refreshInterval, maxArticlesPerFeed } = body

    const updates: { key: string; value: string }[] = []

    // AI settings
    if (ai) {
      if (ai.provider !== undefined) {
        updates.push({ key: 'ai_provider', value: ai.provider })
      }
      if (ai.systemPrompt !== undefined) {
        updates.push({ key: 'ai_system_prompt', value: ai.systemPrompt })
      }
      if (ai.maxTokens !== undefined) {
        updates.push({ key: 'ai_max_tokens', value: ai.maxTokens.toString() })
      }
      if (ai.temperature !== undefined) {
        updates.push({ key: 'ai_temperature', value: ai.temperature.toString() })
      }
      if (ai.apiKey !== undefined) {
        updates.push({ key: 'ai_api_key', value: ai.apiKey })
      }
      if (ai.model !== undefined) {
        updates.push({ key: 'ai_model', value: ai.model })
      }
    }

    // General settings
    if (refreshInterval !== undefined) {
      updates.push({ key: 'refresh_interval', value: refreshInterval.toString() })
    }
    if (maxArticlesPerFeed !== undefined) {
      updates.push({ key: 'max_articles_per_feed', value: maxArticlesPerFeed.toString() })
    }

    if (updates.length === 0) {
      return c.json({
        error: 'No updates provided',
        message: 'At least one setting must be updated'
      }, 400)
    }

    // Update settings in database
    const updateStatements = updates.map(({ key, value }) =>
      c.env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value, 
        updated_at = excluded.updated_at
      `).bind(key, value, new Date().toISOString())
    )

    await c.env.DB.batch(updateStatements)

    return c.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return c.json({
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/settings/test-ai - Test AI connection
settingsRouter.post('/test-ai', async (c) => {
  try {
    const ai = new AIService(c.env)
    const result = await ai.testConnection()
    
    return c.json(result)
  } catch (error) {
    console.error('Failed to test AI connection:', error)
    return c.json({
      success: false,
      message: `AI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})

// GET /api/settings/categories - Get all feed categories
settingsRouter.get('/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT category FROM rss_feeds 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `).all<{ category: string }>()

    const categories = results.map(row => row.category)
    return c.json(categories)
  } catch (error) {
    console.error('Failed to get categories:', error)
    return c.json({
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/settings/stats - Get application statistics
settingsRouter.get('/stats', async (c) => {
  try {
    const [
      feedsResult,
      articlesResult,
      workspaceResult,
      reportsResult
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM rss_feeds').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM articles WHERE is_archived = 0').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM workspace_items').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM reports').first<{ count: number }>()
    ])

    // Get articles by category
    const { results: categoryStats } = await c.env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM articles 
      WHERE is_archived = 0 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all<{ category: string; count: number }>()

    // Get recent activity
    const { results: recentArticles } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM articles 
      WHERE created_at > datetime('now', '-24 hours')
    `).all<{ count: number }>()

    const stats = {
      totals: {
        feeds: feedsResult?.count || 0,
        articles: articlesResult?.count || 0,
        workspaceItems: workspaceResult?.count || 0,
        reports: reportsResult?.count || 0
      },
      categories: categoryStats,
      activity: {
        articlesLast24Hours: recentArticles[0]?.count || 0
      }
    }

    return c.json(stats)
  } catch (error) {
    console.error('Failed to get stats:', error)
    return c.json({
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/settings/reset - Reset all settings to defaults
settingsRouter.post('/reset', async (c) => {
  try {
    const defaultSettings = [
      { key: 'ai_provider', value: 'cloudflare' },
      { key: 'ai_system_prompt', value: 'You are a factual, neutral geopolitical analyst. Your task is to summarize the following article. Extract only the key facts, policy statements, and strategic arguments. Avoid speculative language and journalistic flair. Present the summary as a series of bullet points. The summary must be concise and no more than 150 words.' },
      { key: 'ai_max_tokens', value: '150' },
      { key: 'ai_temperature', value: '0.3' },
      { key: 'refresh_interval', value: '30' },
      { key: 'max_articles_per_feed', value: '50' }
    ]

    // Delete all existing settings
    await c.env.DB.prepare('DELETE FROM settings').run()

    // Insert default settings
    const insertStatements = defaultSettings.map(({ key, value }) =>
      c.env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, ?)
      `).bind(key, value, new Date().toISOString())
    )

    await c.env.DB.batch(insertStatements)

    return c.json({ 
      success: true, 
      message: 'Settings reset to defaults successfully' 
    })
  } catch (error) {
    console.error('Failed to reset settings:', error)
    return c.json({
      error: 'Failed to reset settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})