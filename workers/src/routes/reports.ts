import { Hono } from 'hono'
import type { Env } from '../types'
import { DatabaseService } from '../services/database'

export const reportsRouter = new Hono<{ Bindings: Env }>()

// GET /api/reports - Get all reports
reportsRouter.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM reports 
      ORDER BY updated_at DESC
    `).all<{
      id: string
      title: string
      description: string | null
      status: string
      created_at: string
      updated_at: string
    }>()

    const reports = results.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as 'draft' | 'published',
      items: [], // Items will be loaded separately when needed
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return c.json(reports)
  } catch (error) {
    console.error('Failed to get reports:', error)
    return c.json({
      error: 'Failed to fetch reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/reports/:id - Get specific report with items
reportsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Get report details
    const report = await c.env.DB.prepare(`
      SELECT * FROM reports WHERE id = ?
    `).bind(id).first<{
      id: string
      title: string
      description: string | null
      status: string
      created_at: string
      updated_at: string
    }>()

    if (!report) {
      return c.json({ error: 'Report not found' }, 404)
    }

    // Get report items with workspace items
    const { results: reportItems } = await c.env.DB.prepare(`
      SELECT ri.*, wi.* 
      FROM report_items ri
      JOIN workspace_items wi ON ri.workspace_item_id = wi.id
      WHERE ri.report_id = ?
      ORDER BY ri.order_index ASC
    `).all<{
      id: string
      article_id: string
      order_index: number
      custom_content: string | null
      custom_analysis: string | null
      is_edited: number
      created_at: string
      updated_at: string
    }>()

    const db = new DatabaseService(c.env)
    const items = reportItems.map(item => ({
      id: item.id,
      articleId: item.article_id,
      order: item.order_index,
      customContent: item.custom_content || undefined,
      customAnalysis: item.custom_analysis || undefined,
      isEdited: Boolean(item.is_edited),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))

    return c.json({
      id: report.id,
      title: report.title,
      description: report.description || undefined,
      status: report.status as 'draft' | 'published',
      items,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    })
  } catch (error) {
    console.error('Failed to get report:', error)
    return c.json({
      error: 'Failed to fetch report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/reports - Create new report
reportsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { title, description, status = 'draft' } = body

    if (!title) {
      return c.json({
        error: 'Missing title',
        message: 'Report title is required'
      }, 400)
    }

    const reportId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create report
    await c.env.DB.prepare(`
      INSERT INTO reports (id, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      reportId,
      title.trim(),
      description?.trim() || null,
      status,
      now,
      now
    ).run()

    // If creating from current workspace, copy workspace items to report
    const copyWorkspace = body.copyWorkspace
    if (copyWorkspace) {
      const db = new DatabaseService(c.env)
      const workspaceItems = await db.getWorkspaceItems()

      if (workspaceItems.length > 0) {
        const reportItemInserts = workspaceItems.map((item, index) =>
          c.env.DB.prepare(`
            INSERT INTO report_items (id, report_id, workspace_item_id, order_index, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            reportId,
            item.id,
            index,
            now
          )
        )

        await c.env.DB.batch(reportItemInserts)
      }
    }

    const createdReport = {
      id: reportId,
      title: title.trim(),
      description: description?.trim(),
      status: status as 'draft' | 'published',
      items: [],
      createdAt: now,
      updatedAt: now
    }

    return c.json(createdReport, 201)
  } catch (error) {
    console.error('Failed to create report:', error)
    return c.json({
      error: 'Failed to create report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// PATCH /api/reports/:id - Update report
reportsRouter.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { title, description, status } = body

    const updateFields: string[] = []
    const updateValues: any[] = []

    if (title !== undefined) {
      updateFields.push('title = ?')
      updateValues.push(title.trim())
    }
    if (description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(description?.trim() || null)
    }
    if (status !== undefined) {
      updateFields.push('status = ?')
      updateValues.push(status)
    }

    if (updateFields.length === 0) {
      return c.json({
        error: 'No updates provided',
        message: 'At least one field must be updated'
      }, 400)
    }

    updateValues.push(id)

    const result = await c.env.DB.prepare(`
      UPDATE reports SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run()

    if (result.changes === 0) {
      return c.json({ error: 'Report not found' }, 404)
    }

    // Return updated report
    const updatedReport = await c.env.DB.prepare(`
      SELECT * FROM reports WHERE id = ?
    `).bind(id).first()

    return c.json(updatedReport)
  } catch (error) {
    console.error('Failed to update report:', error)
    return c.json({
      error: 'Failed to update report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// DELETE /api/reports/:id - Delete report
reportsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await c.env.DB.prepare(`
      DELETE FROM reports WHERE id = ?
    `).bind(id).run()

    if (result.changes === 0) {
      return c.json({ error: 'Report not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete report:', error)
    return c.json({
      error: 'Failed to delete report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/reports/:id/export - Export report in various formats
reportsRouter.get('/:id/export', async (c) => {
  try {
    const id = c.req.param('id')
    const format = c.req.query('format') || 'json'
    
    // Get report with items and articles
    const report = await c.env.DB.prepare(`
      SELECT * FROM reports WHERE id = ?
    `).bind(id).first()

    if (!report) {
      return c.json({ error: 'Report not found' }, 404)
    }

    // Get report items with articles
    const { results: items } = await c.env.DB.prepare(`
      SELECT 
        ri.order_index,
        wi.custom_content,
        wi.custom_analysis,
        wi.is_edited,
        a.title,
        a.content,
        a.category,
        a.published_at,
        a.url,
        a.summary,
        a.author
      FROM report_items ri
      JOIN workspace_items wi ON ri.workspace_item_id = wi.id
      JOIN articles a ON wi.article_id = a.id
      WHERE ri.report_id = ?
      ORDER BY ri.order_index ASC
    `).all<any>()

    const exportData = {
      report: {
        id: report.id,
        title: report.title,
        description: report.description,
        status: report.status,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        exportedAt: new Date().toISOString()
      },
      items: items.map((item, index) => ({
        order: index + 1,
        title: item.title,
        category: item.category,
        publishedDate: item.published_at,
        url: item.url,
        summary: item.summary,
        content: item.custom_content || item.content,
        analysis: item.custom_analysis,
        isEdited: Boolean(item.is_edited),
        author: item.author
      })),
      metadata: {
        totalItems: items.length,
        exportFormat: format
      }
    }

    switch (format.toLowerCase()) {
      case 'json':
        return c.json(exportData)

      case 'html':
        const html = generateHTML(exportData)
        return c.text(html, 200, {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`
        })

      case 'csv':
        const csvContent = generateCSV(exportData)
        return c.text(csvContent, 200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`
        })

      default:
        return c.json({
          error: 'Unsupported format',
          message: 'Supported formats: json, html, csv'
        }, 400)
    }
  } catch (error) {
    console.error('Failed to export report:', error)
    return c.json({
      error: 'Failed to export report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper functions for export formats
function generateHTML(data: any): string {
  // Simple HTML template for report export
  return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
        .item { margin-bottom: 30px; border-left: 4px solid #007cba; padding-left: 20px; }
        .title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 15px; }
        .content { line-height: 1.6; }
        .analysis { background: #f0f8ff; padding: 15px; margin-top: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.report.title}</h1>
        <p>Generated on ${new Date(data.report.exportedAt).toLocaleDateString()}</p>
    </div>
    
    ${data.items.map((item: any, index: number) => `
        <div class="item">
            <div class="title">${index + 1}. ${item.title}</div>
            <div class="meta">${item.category} • ${new Date(item.publishedDate).toLocaleDateString()}</div>
            <div class="content">${item.content.replace(/\n/g, '<br>')}</div>
            ${item.analysis ? `<div class="analysis"><strong>Analysis:</strong> ${item.analysis}</div>` : ''}
        </div>
    `).join('')}
</body>
</html>`
}

function generateCSV(data: any): string {
  const headers = ['Order', 'Title', 'Category', 'Published Date', 'URL', 'Content', 'Analysis']
  const rows = data.items.map((item: any) => [
    item.order,
    `"${item.title.replace(/"/g, '""')}"`,
    `"${item.category || ''}"`,
    new Date(item.publishedDate).toLocaleDateString(),
    item.url,
    `"${item.content.replace(/"/g, '""')}"`,
    `"${item.analysis || ''}"`
  ])

  return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n')
}