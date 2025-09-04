// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database
  VECTORIZE: Vectorize
  AI: Ai
  CACHE: KVNamespace
  ENVIRONMENT: string
}

// Database types
export interface RSSFeedRow {
  id: string
  name: string
  url: string
  category: string
  is_active: number
  last_fetched: string | null
  created_at: string
  updated_at: string
}

export interface ArticleRow {
  id: string
  feed_id: string
  title: string
  content: string
  snippet: string
  author: string | null
  published_at: string
  url: string
  is_read: number
  is_archived: number
  created_at: string
  updated_at: string
  category: string | null
  summary: string | null
  analysis: string | null
}

export interface WorkspaceItemRow {
  id: string
  article_id: string
  order_index: number
  custom_content: string | null
  custom_analysis: string | null
  is_edited: number
  created_at: string
  updated_at: string
}

export interface ReportRow {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface SettingsRow {
  key: string
  value: string
  updated_at: string
}

// API types
export interface RSSFeed {
  id: string
  name: string
  url: string
  category: string
  isActive: boolean
  lastFetched?: string
  createdAt: string
  updatedAt: string
}

export interface Article {
  id: string
  feedId: string
  title: string
  content: string
  snippet: string
  author?: string
  publishedAt: string
  url: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  category?: string
  summary?: string
  analysis?: string
}

export interface WorkspaceItem {
  id: string
  articleId: string
  order: number
  customContent?: string
  customAnalysis?: string
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  title: string
  description?: string
  items: WorkspaceItem[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface AISettings {
  provider: 'cloudflare' | 'external'
  model?: string
  apiKey?: string
  systemPrompt: string
  maxTokens: number
  temperature: number
}

export interface AppSettings {
  ai: AISettings
  refreshInterval: number
  maxArticlesPerFeed: number
}

// RSS Parser types
export interface RSSItem {
  title?: string
  link?: string
  content?: string
  contentSnippet?: string
  author?: string
  pubDate?: string
  guid?: string
}

// Cloudflare AI types
export interface EmbeddingResult {
  shape: number[]
  data: number[][]
}

export interface SummarizationResult {
  summary: string
}