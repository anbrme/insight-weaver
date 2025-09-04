import React, { useState, useEffect } from 'react'
import { Plus, Filter, RefreshCw, Search } from 'lucide-react'
import ArticleCard from '../components/dashboard/ArticleCard'
import FeedColumn from '../components/dashboard/FeedColumn'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Article, RSSFeed, DashboardFilters } from '../types'

// Mock data for development
const mockFeeds: RSSFeed[] = [
  {
    id: '1',
    name: 'CFR Analysis',
    url: 'https://www.cfr.org/rss/feeds/analysis',
    category: 'Think Tanks',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'US State Department',
    url: 'https://www.state.gov/rss/',
    category: 'Official Statements',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Brookings Institution',
    url: 'https://www.brookings.edu/feed/',
    category: 'Think Tanks',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

const mockArticles: Article[] = [
  {
    id: '1',
    feedId: '1',
    title: 'US-China Trade Relations: Current Tensions and Future Prospects',
    content: 'Full article content would be here...',
    snippet: 'Recent developments in US-China trade negotiations suggest a shift in diplomatic approach...',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.com/article1',
    isRead: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Think Tanks'
  },
  {
    id: '2',
    feedId: '2',
    title: 'Secretary Blinken Statement on Middle East Policy',
    content: 'Full article content would be here...',
    snippet: 'The Department of State announces new diplomatic initiatives for regional stability...',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.com/article2',
    isRead: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Official Statements'
  },
  {
    id: '3',
    feedId: '3',
    title: 'Economic Sanctions: Effectiveness and Unintended Consequences',
    content: 'Full article content would be here...',
    snippet: 'Analysis of recent sanctions packages reveals complex economic and political dynamics...',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.com/article3',
    isRead: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Think Tanks'
  }
]

const Dashboard: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([])
  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setArticles(mockArticles)
      setFeeds(mockFeeds)
      setLoading(false)
    }

    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRefreshing(false)
  }

  const handleAddToWorkspace = (articleId: string) => {
    console.log('Adding article to workspace:', articleId)
    // TODO: Implement add to workspace functionality
  }

  const handleMarkAsRead = (articleId: string) => {
    setArticles(prev =>
      prev.map(article =>
        article.id === articleId
          ? { ...article, isRead: true }
          : article
      )
    )
  }

  const handleArchive = (articleId: string) => {
    setArticles(prev =>
      prev.map(article =>
        article.id === articleId
          ? { ...article, isArchived: true }
          : article
      )
    )
  }

  // Group articles by category
  const articlesByCategory = React.useMemo(() => {
    const filtered = articles
      .filter(article => !article.isArchived)
      .filter(article => {
        if (searchTerm) {
          return article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 article.snippet.toLowerCase().includes(searchTerm.toLowerCase())
        }
        return true
      })
      .filter(article => {
        if (filters.category) {
          return article.category === filters.category
        }
        return true
      })
      .filter(article => {
        if (filters.status === 'read') return article.isRead
        if (filters.status === 'unread') return !article.isRead
        return true
      })

    const grouped = filtered.reduce((acc, article) => {
      const category = article.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(article)
      return acc
    }, {} as Record<string, Article[]>)

    return grouped
  }, [articles, filters, searchTerm])

  const categories = Array.from(new Set(feeds.map(feed => feed.category)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary btn-sm flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-sm text-gray-500">
            {articles.filter(a => !a.isArchived).length} articles
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-64"
            />
          </div>
          
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              category: e.target.value || undefined
            }))}
            className="input w-40"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              status: e.target.value as any || undefined
            }))}
            className="input w-32"
          >
            <option value="">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Feed columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(articlesByCategory).map(([category, categoryArticles]) => (
          <FeedColumn
            key={category}
            title={category}
            articles={categoryArticles}
            onAddToWorkspace={handleAddToWorkspace}
            onMarkAsRead={handleMarkAsRead}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {/* Empty state */}
      {Object.keys(articlesByCategory).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {articles.length === 0 ? 'No articles found.' : 'No articles match your filters.'}
          </div>
          {articles.length === 0 && (
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add RSS Feeds
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard