import React from 'react'
import { Folder } from 'lucide-react'
import ArticleCard from './ArticleCard'
import { Article } from '../../types'

interface FeedColumnProps {
  title: string
  articles: Article[]
  onAddToWorkspace: (articleId: string) => void
  onMarkAsRead: (articleId: string) => void
  onArchive: (articleId: string) => void
}

const FeedColumn: React.FC<FeedColumnProps> = ({
  title,
  articles,
  onAddToWorkspace,
  onMarkAsRead,
  onArchive
}) => {
  const unreadCount = articles.filter(article => !article.isRead).length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Column header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Folder className="w-4 h-4 text-gray-500 mr-2" />
            <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
            <span className="text-xs text-gray-500">
              {articles.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Articles list */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {articles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-sm">No articles in this category</div>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onAddToWorkspace={onAddToWorkspace}
                onMarkAsRead={onMarkAsRead}
                onArchive={onArchive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedColumn