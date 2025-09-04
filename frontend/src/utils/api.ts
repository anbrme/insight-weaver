// API utility functions for communicating with Cloudflare Workers

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://insight-weaver-api.your-domain.workers.dev'
  : '/api'

class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'APIError'
  }
}

async function fetchAPI<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new APIError(
      `API request failed: ${response.statusText}`,
      response.status
    )
  }

  return response.json()
}

// RSS Feeds API
export const feedsAPI = {
  async getFeeds() {
    return fetchAPI<RSSFeed[]>('/feeds')
  },

  async createFeed(feed: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt'>) {
    return fetchAPI<RSSFeed>('/feeds', {
      method: 'POST',
      body: JSON.stringify(feed),
    })
  },

  async updateFeed(id: string, updates: Partial<RSSFeed>) {
    return fetchAPI<RSSFeed>(`/feeds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async deleteFeed(id: string) {
    return fetchAPI<{ success: boolean }>(`/feeds/${id}`, {
      method: 'DELETE',
    })
  },

  async refreshFeed(id: string) {
    return fetchAPI<{ success: boolean }>(`/feeds/${id}/refresh`, {
      method: 'POST',
    })
  },
}

// Articles API
export const articlesAPI = {
  async getArticles(filters?: {
    category?: string
    status?: string
    limit?: number
    offset?: number
  }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const query = params.toString()
    return fetchAPI<{ articles: Article[]; total: number }>(
      `/articles${query ? `?${query}` : ''}`
    )
  },

  async getArticle(id: string) {
    return fetchAPI<Article>(`/articles/${id}`)
  },

  async updateArticle(id: string, updates: Partial<Article>) {
    return fetchAPI<Article>(`/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async summarizeArticle(id: string) {
    return fetchAPI<{ summary: string }>(`/articles/${id}/summarize`, {
      method: 'POST',
    })
  },
}

// Workspace API
export const workspaceAPI = {
  async getWorkspaceItems() {
    return fetchAPI<WorkspaceItem[]>('/workspace/items')
  },

  async addToWorkspace(articleId: string) {
    return fetchAPI<WorkspaceItem>('/workspace/items', {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    })
  },

  async updateWorkspaceItem(id: string, updates: Partial<WorkspaceItem>) {
    return fetchAPI<WorkspaceItem>(`/workspace/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async removeFromWorkspace(id: string) {
    return fetchAPI<{ success: boolean }>(`/workspace/items/${id}`, {
      method: 'DELETE',
    })
  },

  async reorderItems(itemIds: string[]) {
    return fetchAPI<{ success: boolean }>('/workspace/reorder', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    })
  },
}

// Reports API
export const reportsAPI = {
  async getReports() {
    return fetchAPI<Report[]>('/reports')
  },

  async getReport(id: string) {
    return fetchAPI<Report>(`/reports/${id}`)
  },

  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) {
    return fetchAPI<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    })
  },

  async updateReport(id: string, updates: Partial<Report>) {
    return fetchAPI<Report>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async deleteReport(id: string) {
    return fetchAPI<{ success: boolean }>(`/reports/${id}`, {
      method: 'DELETE',
    })
  },

  async exportReport(id: string, format: string) {
    const response = await fetch(`${API_BASE_URL}/reports/${id}/export?format=${format}`)
    if (!response.ok) {
      throw new APIError('Export failed', response.status)
    }
    return response.blob()
  },
}

// Settings API
export const settingsAPI = {
  async getSettings() {
    return fetchAPI<AppSettings>('/settings')
  },

  async updateSettings(settings: Partial<AppSettings>) {
    return fetchAPI<AppSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  },

  async testAIConnection() {
    return fetchAPI<{ success: boolean; message: string }>('/settings/test-ai', {
      method: 'POST',
    })
  },
}

// Type imports (these would normally be in a separate types file)
import type { RSSFeed, Article, WorkspaceItem, Report, AppSettings } from '../types'