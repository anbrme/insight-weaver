// Database service utilities
import type { 
  Env, 
  RSSFeed, 
  RSSFeedRow, 
  Article, 
  ArticleRow, 
  WorkspaceItem, 
  WorkspaceItemRow,
  Report,
  ReportRow
} from '../types'

export class DatabaseService {
  constructor(private env: Env) {}

  // RSS Feeds
  async getRSSFeeds(): Promise<RSSFeed[]> {
    const { results } = await this.env.DB.prepare(
      'SELECT * FROM rss_feeds ORDER BY name ASC'
    ).all<RSSFeedRow>()

    return results.map(this.mapRSSFeedRow)
  }

  async getRSSFeed(id: string): Promise<RSSFeed | null> {
    const feed = await this.env.DB.prepare(
      'SELECT * FROM rss_feeds WHERE id = ?'
    ).bind(id).first<RSSFeedRow>()

    return feed ? this.mapRSSFeedRow(feed) : null
  }

  async createRSSFeed(feed: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt'>): Promise<RSSFeed> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.env.DB.prepare(`
      INSERT INTO rss_feeds (id, name, url, category, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      feed.name,
      feed.url,
      feed.category,
      feed.isActive ? 1 : 0,
      now,
      now
    ).run()

    return {
      id,
      ...feed,
      createdAt: now,
      updatedAt: now
    }
  }

  async updateRSSFeed(id: string, updates: Partial<RSSFeed>): Promise<RSSFeed | null> {
    const existingFeed = await this.getRSSFeed(id)
    if (!existingFeed) return null

    const updateFields: string[] = []
    const updateValues: any[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(updates.name)
    }
    if (updates.url !== undefined) {
      updateFields.push('url = ?')
      updateValues.push(updates.url)
    }
    if (updates.category !== undefined) {
      updateFields.push('category = ?')
      updateValues.push(updates.category)
    }
    if (updates.isActive !== undefined) {
      updateFields.push('is_active = ?')
      updateValues.push(updates.isActive ? 1 : 0)
    }
    if (updates.lastFetched !== undefined) {
      updateFields.push('last_fetched = ?')
      updateValues.push(updates.lastFetched)
    }

    if (updateFields.length === 0) return existingFeed

    updateValues.push(id)

    await this.env.DB.prepare(`
      UPDATE rss_feeds SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run()

    return this.getRSSFeed(id)
  }

  async deleteRSSFeed(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      'DELETE FROM rss_feeds WHERE id = ?'
    ).bind(id).run()

    return result.changes > 0
  }

  // Articles
  async getArticles(options: {
    category?: string
    status?: string
    limit?: number
    offset?: number
    feedId?: string
  } = {}): Promise<{ articles: Article[]; total: number }> {
    let query = 'SELECT * FROM articles WHERE is_archived = 0'
    const bindings: any[] = []

    if (options.category) {
      query += ' AND category = ?'
      bindings.push(options.category)
    }

    if (options.status === 'read') {
      query += ' AND is_read = 1'
    } else if (options.status === 'unread') {
      query += ' AND is_read = 0'
    }

    if (options.feedId) {
      query += ' AND feed_id = ?'
      bindings.push(options.feedId)
    }

    // Count total
    const countResult = await this.env.DB.prepare(
      query.replace('SELECT *', 'SELECT COUNT(*) as count')
    ).bind(...bindings).first<{ count: number }>()

    const total = countResult?.count || 0

    // Get articles
    query += ' ORDER BY published_at DESC'
    
    if (options.limit) {
      query += ' LIMIT ?'
      bindings.push(options.limit)
    }

    if (options.offset) {
      query += ' OFFSET ?'
      bindings.push(options.offset)
    }

    const { results } = await this.env.DB.prepare(query).bind(...bindings).all<ArticleRow>()

    return {
      articles: results.map(this.mapArticleRow),
      total
    }
  }

  async getArticle(id: string): Promise<Article | null> {
    const article = await this.env.DB.prepare(
      'SELECT * FROM articles WHERE id = ?'
    ).bind(id).first<ArticleRow>()

    return article ? this.mapArticleRow(article) : null
  }

  async createArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.env.DB.prepare(`
      INSERT INTO articles (
        id, feed_id, title, content, snippet, author, published_at, url, 
        is_read, is_archived, created_at, updated_at, category, summary, analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      article.feedId,
      article.title,
      article.content,
      article.snippet,
      article.author || null,
      article.publishedAt,
      article.url,
      article.isRead ? 1 : 0,
      article.isArchived ? 1 : 0,
      now,
      now,
      article.category || null,
      article.summary || null,
      article.analysis || null
    ).run()

    return {
      id,
      ...article,
      createdAt: now,
      updatedAt: now
    }
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
    const existingArticle = await this.getArticle(id)
    if (!existingArticle) return null

    const updateFields: string[] = []
    const updateValues: any[] = []

    if (updates.isRead !== undefined) {
      updateFields.push('is_read = ?')
      updateValues.push(updates.isRead ? 1 : 0)
    }
    if (updates.isArchived !== undefined) {
      updateFields.push('is_archived = ?')
      updateValues.push(updates.isArchived ? 1 : 0)
    }
    if (updates.summary !== undefined) {
      updateFields.push('summary = ?')
      updateValues.push(updates.summary)
    }
    if (updates.analysis !== undefined) {
      updateFields.push('analysis = ?')
      updateValues.push(updates.analysis)
    }

    if (updateFields.length === 0) return existingArticle

    updateValues.push(id)

    await this.env.DB.prepare(`
      UPDATE articles SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run()

    return this.getArticle(id)
  }

  // Workspace Items
  async getWorkspaceItems(): Promise<WorkspaceItem[]> {
    const { results } = await this.env.DB.prepare(
      'SELECT * FROM workspace_items ORDER BY order_index ASC'
    ).all<WorkspaceItemRow>()

    return results.map(this.mapWorkspaceItemRow)
  }

  async addToWorkspace(articleId: string): Promise<WorkspaceItem> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get next order index
    const maxOrderResult = await this.env.DB.prepare(
      'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM workspace_items'
    ).first<{ next_order: number }>()

    const orderIndex = maxOrderResult?.next_order || 0

    await this.env.DB.prepare(`
      INSERT INTO workspace_items (id, article_id, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, articleId, orderIndex, now, now).run()

    return {
      id,
      articleId,
      order: orderIndex,
      isEdited: false,
      createdAt: now,
      updatedAt: now
    }
  }

  async updateWorkspaceItem(id: string, updates: Partial<WorkspaceItem>): Promise<WorkspaceItem | null> {
    const existing = await this.env.DB.prepare(
      'SELECT * FROM workspace_items WHERE id = ?'
    ).bind(id).first<WorkspaceItemRow>()

    if (!existing) return null

    const updateFields: string[] = []
    const updateValues: any[] = []

    if (updates.customContent !== undefined) {
      updateFields.push('custom_content = ?')
      updateValues.push(updates.customContent)
      updateFields.push('is_edited = ?')
      updateValues.push(1)
    }
    if (updates.customAnalysis !== undefined) {
      updateFields.push('custom_analysis = ?')
      updateValues.push(updates.customAnalysis)
      updateFields.push('is_edited = ?')
      updateValues.push(1)
    }

    if (updateFields.length === 0) return this.mapWorkspaceItemRow(existing)

    updateValues.push(id)

    await this.env.DB.prepare(`
      UPDATE workspace_items SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run()

    const updated = await this.env.DB.prepare(
      'SELECT * FROM workspace_items WHERE id = ?'
    ).bind(id).first<WorkspaceItemRow>()

    return updated ? this.mapWorkspaceItemRow(updated) : null
  }

  async removeFromWorkspace(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      'DELETE FROM workspace_items WHERE id = ?'
    ).bind(id).run()

    return result.changes > 0
  }

  // Helper methods to map database rows to API types
  private mapRSSFeedRow(row: RSSFeedRow): RSSFeed {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      isActive: Boolean(row.is_active),
      lastFetched: row.last_fetched || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapArticleRow(row: ArticleRow): Article {
    return {
      id: row.id,
      feedId: row.feed_id,
      title: row.title,
      content: row.content,
      snippet: row.snippet,
      author: row.author || undefined,
      publishedAt: row.published_at,
      url: row.url,
      isRead: Boolean(row.is_read),
      isArchived: Boolean(row.is_archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.category || undefined,
      summary: row.summary || undefined,
      analysis: row.analysis || undefined
    }
  }

  private mapWorkspaceItemRow(row: WorkspaceItemRow): WorkspaceItem {
    return {
      id: row.id,
      articleId: row.article_id,
      order: row.order_index,
      customContent: row.custom_content || undefined,
      customAnalysis: row.custom_analysis || undefined,
      isEdited: Boolean(row.is_edited),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}