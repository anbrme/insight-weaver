// RSS feed fetching service
import type { Env, RSSItem } from '../types'
import { DatabaseService } from './database'
// @ts-ignore - RSS parser doesn't have proper types
import Parser from 'rss-parser'

const RSS_TIMEOUT = 30000 // 30 seconds

export class FeedFetcher {
  private db: DatabaseService
  private parser: any

  constructor(private env: Env) {
    this.db = new DatabaseService(env)
    this.parser = new Parser({
      timeout: RSS_TIMEOUT,
      headers: {
        'User-Agent': 'Insight Weaver RSS Reader/1.0'
      }
    })
  }

  async fetchAllFeeds(): Promise<void> {
    const feeds = await this.db.getRSSFeeds()
    const activeFeeds = feeds.filter(feed => feed.isActive)

    console.log(`Fetching ${activeFeeds.length} active RSS feeds`)

    // Process feeds in parallel with a limit
    const BATCH_SIZE = 5
    for (let i = 0; i < activeFeeds.length; i += BATCH_SIZE) {
      const batch = activeFeeds.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(
        batch.map(feed => this.fetchFeed(feed.id))
      )
    }
  }

  async fetchFeed(feedId: string): Promise<{ success: boolean; articlesAdded: number; error?: string }> {
    try {
      const feed = await this.db.getRSSFeed(feedId)
      if (!feed || !feed.isActive) {
        return { success: false, articlesAdded: 0, error: 'Feed not found or inactive' }
      }

      console.log(`Fetching RSS feed: ${feed.name} (${feed.url})`)

      // Parse RSS feed
      const parsedFeed = await this.parser.parseURL(feed.url)
      const items: RSSItem[] = parsedFeed.items || []

      let articlesAdded = 0
      const maxArticles = await this.getMaxArticlesPerFeed()

      // Process only the most recent articles
      const recentItems = items.slice(0, maxArticles)

      for (const item of recentItems) {
        if (!item.link || !item.title) continue

        // Check if article already exists
        const existing = await this.env.DB.prepare(
          'SELECT id FROM articles WHERE url = ?'
        ).bind(item.link).first()

        if (existing) continue

        // Create article
        const article = {
          feedId: feed.id,
          title: this.cleanText(item.title),
          content: this.extractContent(item),
          snippet: this.createSnippet(item),
          author: item.author || undefined,
          publishedAt: this.parseDate(item.pubDate),
          url: item.link,
          isRead: false,
          isArchived: false,
          category: feed.category
        }

        try {
          await this.db.createArticle(article)
          articlesAdded++
        } catch (error) {
          console.error(`Failed to create article: ${item.title}`, error)
          continue
        }
      }

      // Update feed's last fetched time
      await this.db.updateRSSFeed(feedId, {
        lastFetched: new Date().toISOString()
      })

      // Clean up old articles if necessary
      await this.cleanupOldArticles(feedId, maxArticles)

      console.log(`Feed ${feed.name}: Added ${articlesAdded} new articles`)

      return { success: true, articlesAdded }
    } catch (error) {
      console.error(`Failed to fetch feed ${feedId}:`, error)
      return {
        success: false,
        articlesAdded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private extractContent(item: RSSItem): string {
    // Try to get the full content, fall back to summary
    let content = item.content || item.contentSnippet || ''
    
    if (!content && item.title) {
      content = item.title
    }

    return this.cleanText(content)
  }

  private createSnippet(item: RSSItem, maxLength: number = 200): string {
    const content = item.contentSnippet || item.content || item.title || ''
    const cleaned = this.cleanText(content)
    
    if (cleaned.length <= maxLength) {
      return cleaned
    }

    // Find a good breaking point (end of sentence)
    const truncated = cleaned.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1)
    } else if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...'
    } else {
      return truncated + '...'
    }
  }

  private cleanText(text: string): string {
    if (!text) return ''

    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }

  private parseDate(dateString?: string): string {
    if (!dateString) {
      return new Date().toISOString()
    }

    try {
      return new Date(dateString).toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private async getMaxArticlesPerFeed(): Promise<number> {
    try {
      const setting = await this.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ?'
      ).bind('max_articles_per_feed').first<{ value: string }>()

      return setting ? parseInt(setting.value, 10) : 50
    } catch {
      return 50
    }
  }

  private async cleanupOldArticles(feedId: string, maxArticles: number): Promise<void> {
    try {
      // Keep only the most recent articles, delete the rest
      await this.env.DB.prepare(`
        DELETE FROM articles 
        WHERE feed_id = ? 
        AND id NOT IN (
          SELECT id FROM articles 
          WHERE feed_id = ? 
          ORDER BY published_at DESC 
          LIMIT ?
        )
      `).bind(feedId, feedId, maxArticles).run()
    } catch (error) {
      console.error(`Failed to cleanup old articles for feed ${feedId}:`, error)
    }
  }
}

// Scheduled function for RSS feed fetching
export async function scheduledFeedFetch(env: Env): Promise<void> {
  try {
    const fetcher = new FeedFetcher(env)
    await fetcher.fetchAllFeeds()
    console.log('Scheduled RSS feed fetch completed')
  } catch (error) {
    console.error('Scheduled RSS feed fetch failed:', error)
  }
}