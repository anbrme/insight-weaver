export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  feedId: string;
  title: string;
  content: string;
  snippet: string;
  author?: string;
  publishedAt: string;
  url: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  category?: string;
  summary?: string;
  analysis?: string;
  embedding?: number[];
}

export interface WorkspaceItem {
  id: string;
  articleId: string;
  order: number;
  customContent?: string;
  customAnalysis?: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  items: WorkspaceItem[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface AISettings {
  provider: 'cloudflare' | 'external';
  model?: string;
  apiKey?: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface AppSettings {
  ai: AISettings;
  refreshInterval: number;
  maxArticlesPerFeed: number;
}

export type ArticleStatus = 'unread' | 'read' | 'archived' | 'workspace';
export type FeedCategory = string;

export interface DashboardFilters {
  category?: string;
  status?: ArticleStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ExportFormat {
  type: 'html' | 'pdf' | 'markdown' | 'json' | 'csv';
  options?: Record<string, any>;
}