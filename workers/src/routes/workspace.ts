import { Hono } from 'hono'
import type { Env } from '../types'
import { DatabaseService } from '../services/database'

export const workspaceRouter = new Hono<{ Bindings: Env }>()

// GET /api/workspace/items - Get all workspace items
workspaceRouter.get('/items', async (c) => {
  try {
    const db = new DatabaseService(c.env)
    const items = await db.getWorkspaceItems()
    return c.json(items)
  } catch (error) {
    console.error('Failed to get workspace items:', error)
    return c.json({
      error: 'Failed to fetch workspace items',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/workspace/items - Add article to workspace
workspaceRouter.post('/items', async (c) => {
  try {
    const body = await c.req.json()
    const { articleId } = body

    if (!articleId) {
      return c.json({
        error: 'Missing article ID',
        message: 'Article ID is required'
      }, 400)
    }

    const db = new DatabaseService(c.env)
    
    // Check if article exists
    const article = await db.getArticle(articleId)
    if (!article) {
      return c.json({ error: 'Article not found' }, 404)
    }

    // Check if article is already in workspace
    const existingItem = await c.env.DB.prepare(
      'SELECT id FROM workspace_items WHERE article_id = ?'
    ).bind(articleId).first()

    if (existingItem) {
      return c.json({
        error: 'Article already in workspace',
        message: 'This article is already added to the workspace'
      }, 409)
    }

    const item = await db.addToWorkspace(articleId)
    return c.json(item, 201)
  } catch (error) {
    console.error('Failed to add item to workspace:', error)
    return c.json({
      error: 'Failed to add item to workspace',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// PATCH /api/workspace/items/:id - Update workspace item
workspaceRouter.patch('/items/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { customContent, customAnalysis } = body

    const db = new DatabaseService(c.env)
    const updatedItem = await db.updateWorkspaceItem(id, {
      ...(customContent !== undefined && { customContent }),
      ...(customAnalysis !== undefined && { customAnalysis })
    })

    if (!updatedItem) {
      return c.json({ error: 'Workspace item not found' }, 404)
    }

    return c.json(updatedItem)
  } catch (error) {
    console.error('Failed to update workspace item:', error)
    return c.json({
      error: 'Failed to update workspace item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// DELETE /api/workspace/items/:id - Remove item from workspace
workspaceRouter.delete('/items/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = new DatabaseService(c.env)
    const deleted = await db.removeFromWorkspace(id)

    if (!deleted) {
      return c.json({ error: 'Workspace item not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to remove workspace item:', error)
    return c.json({
      error: 'Failed to remove workspace item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/workspace/reorder - Reorder workspace items
workspaceRouter.post('/reorder', async (c) => {
  try {
    const body = await c.req.json()
    const { itemIds } = body

    if (!Array.isArray(itemIds)) {
      return c.json({
        error: 'Invalid item IDs',
        message: 'Item IDs must be an array'
      }, 400)
    }

    // Update order for each item
    const updates = itemIds.map((itemId, index) => 
      c.env.DB.prepare(
        'UPDATE workspace_items SET order_index = ? WHERE id = ?'
      ).bind(index, itemId)
    )

    await c.env.DB.batch(updates)

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder workspace items:', error)
    return c.json({
      error: 'Failed to reorder workspace items',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/workspace/export - Export workspace as different formats
workspaceRouter.get('/export', async (c) => {
  try {
    const format = c.req.query('format') || 'json'
    const db = new DatabaseService(c.env)
    
    const items = await db.getWorkspaceItems()
    
    // Get articles for each workspace item
    const articlesData = await Promise.all(
      items.map(async (item) => {
        const article = await db.getArticle(item.articleId)
        return { item, article }
      })
    )

    const validData = articlesData.filter(data => data.article !== null)

    switch (format.toLowerCase()) {
      case 'json':
        return c.json({
          workspace: {
            items: validData.map(({ item, article }) => ({
              ...item,
              article
            })),
            exportedAt: new Date().toISOString(),
            totalItems: validData.length
          }
        })

      case 'csv':
        const csvHeaders = [
          'Order',
          'Title',
          'Category',
          'Published Date',
          'URL',
          'Content',
          'Custom Analysis',
          'Is Edited'
        ]

        const csvRows = validData.map(({ item, article }) => [
          item.order,
          `"${article!.title.replace(/"/g, '""')}"`,
          `"${article!.category || ''}"`,
          new Date(article!.publishedAt).toLocaleDateString(),
          article!.url,
          `"${(item.customContent || article!.content).replace(/"/g, '""')}"`,
          `"${(item.customAnalysis || '').replace(/"/g, '""')}"`,
          item.isEdited ? 'Yes' : 'No'
        ])

        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

        return c.text(csvContent, 200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="workspace-export.csv"'
        })

      default:
        return c.json({
          error: 'Unsupported format',
          message: 'Supported formats: json, csv'
        }, 400)
    }
  } catch (error) {
    console.error('Failed to export workspace:', error)
    return c.json({
      error: 'Failed to export workspace',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/workspace/clear - Clear all items from workspace
workspaceRouter.post('/clear', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM workspace_items').run()
    return c.json({ success: true, message: 'Workspace cleared' })
  } catch (error) {
    console.error('Failed to clear workspace:', error)
    return c.json({
      error: 'Failed to clear workspace',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})