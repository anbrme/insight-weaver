import { Hono } from 'hono'
import type { Env } from '../types'
import { DatabaseService } from '../services/database'
import { FeedFetcher } from '../services/feedFetcher'

export const feedsRouter = new Hono<{ Bindings: Env }>()

// GET /api/feeds - Get all RSS feeds
feedsRouter.get('/', async (c) => {
  try {
    const db = new DatabaseService(c.env)
    const feeds = await db.getRSSFeeds()
    return c.json(feeds)
  } catch (error) {
    console.error('Failed to get feeds:', error)
    return c.json({
      error: 'Failed to fetch feeds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/feeds/:id - Get specific RSS feed
feedsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    const feed = await db.getRSSFeed(id)
    
    if (!feed) {
      return c.json({ error: 'Feed not found' }, 404)
    }
    
    return c.json(feed)
  } catch (error) {
    console.error('Failed to get feed:', error)
    return c.json({
      error: 'Failed to fetch feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/feeds - Create new RSS feed
feedsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { name, url, category, isActive = true } = body

    if (!name || !url) {
      return c.json({
        error: 'Missing required fields',
        message: 'Name and URL are required'
      }, 400)
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return c.json({
        error: 'Invalid URL',
        message: 'Please provide a valid RSS feed URL'
      }, 400)
    }

    const db = new DatabaseService(c.env)
    const feed = await db.createRSSFeed({
      name: name.trim(),
      url: url.trim(),
      category: category?.trim() || 'Uncategorized',
      isActive
    })

    // Try to fetch the feed immediately to validate it
    try {
      const fetcher = new FeedFetcher(c.env)
      await fetcher.fetchFeed(feed.id)
    } catch (fetchError) {
      console.warn(`Initial feed fetch failed for ${feed.name}:`, fetchError)
      // Don't fail the creation, just log the warning
    }

    return c.json(feed, 201)
  } catch (error) {
    console.error('Failed to create feed:', error)
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        error: 'Duplicate URL',
        message: 'A feed with this URL already exists'
      }, 409)
    }
    
    return c.json({
      error: 'Failed to create feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// PATCH /api/feeds/:id - Update RSS feed
feedsRouter.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { name, url, category, isActive } = body

    // Validate URL if provided
    if (url) {
      try {
        new URL(url)
      } catch {
        return c.json({
          error: 'Invalid URL',
          message: 'Please provide a valid RSS feed URL'
        }, 400)
      }
    }

    const db = new DatabaseService(c.env)
    const updatedFeed = await db.updateRSSFeed(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(url !== undefined && { url: url.trim() }),
      ...(category !== undefined && { category: category.trim() }),
      ...(isActive !== undefined && { isActive })
    })

    if (!updatedFeed) {
      return c.json({ error: 'Feed not found' }, 404)
    }

    return c.json(updatedFeed)
  } catch (error) {
    console.error('Failed to update feed:', error)
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        error: 'Duplicate URL',
        message: 'A feed with this URL already exists'
      }, 409)
    }
    
    return c.json({
      error: 'Failed to update feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// DELETE /api/feeds/:id - Delete RSS feed
feedsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    const deleted = await db.deleteRSSFeed(id)
    
    if (!deleted) {
      return c.json({ error: 'Feed not found' }, 404)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete feed:', error)
    return c.json({
      error: 'Failed to delete feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/feeds/:id/refresh - Manually refresh specific feed
feedsRouter.post('/:id/refresh', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    
    const feed = await db.getRSSFeed(id)
    if (!feed) {
      return c.json({ error: 'Feed not found' }, 404)
    }

    const fetcher = new FeedFetcher(c.env)
    const result = await fetcher.fetchFeed(id)

    return c.json(result)
  } catch (error) {
    console.error('Failed to refresh feed:', error)
    return c.json({
      error: 'Failed to refresh feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/feeds/refresh-all - Manually refresh all active feeds
feedsRouter.post('/refresh-all', async (c) => {
  try {
    const fetcher = new FeedFetcher(c.env)
    await fetcher.fetchAllFeeds()

    return c.json({ success: true, message: 'All feeds refreshed successfully' })
  } catch (error) {
    console.error('Failed to refresh all feeds:', error)
    return c.json({
      error: 'Failed to refresh feeds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})