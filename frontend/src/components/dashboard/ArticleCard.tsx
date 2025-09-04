import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Check, Archive, ExternalLink, Clock } from 'lucide-react'
import { Article } from '../../types'

interface ArticleCardProps {
  article: Article
  onAddToWorkspace: (articleId: string) => void
  onMarkAsRead: (articleId: string) => void
  onArchive: (articleId: string) => void
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onAddToWorkspace,
  onMarkAsRead,
  onArchive
}) => {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown date'
    }
  }

  return (
    <div className={`card card-hover transition-all duration-200 ${
      article.isRead ? 'opacity-75 bg-gray-50' : 'bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm leading-tight line-clamp-2 ${
            article.isRead ? 'text-gray-600' : 'text-gray-900'
          }`}>
            {article.title}
          </h3>
        </div>
        {!article.isRead && (
          <div className="w-2 h-2 bg-primary-500 rounded-full ml-2 mt-1 flex-shrink-0" />
        )}
      </div>

      {/* Content snippet */}
      <p className="text-xs text-gray-600 mb-4 line-clamp-3">
        {article.snippet}
      </p>

      {/* Metadata */}
      <div className="flex items-center text-xs text-gray-500 mb-4">
        <Clock className="w-3 h-3 mr-1" />
        {formatDate(article.publishedAt)}
        {article.author && (
          <>
            <span className="mx-2">•</span>
            <span className="truncate">{article.author}</span>
          </>
        )}
      </div>

      {/* AI Summary if available */}
      {article.summary && (
        <div className="bg-primary-50 rounded-lg p-3 mb-4">
          <div className="text-xs font-medium text-primary-800 mb-1">AI Summary</div>
          <p className="text-xs text-primary-700 line-clamp-3">{article.summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onAddToWorkspace(article.id)}
            className="btn btn-ghost btn-sm text-primary-600 hover:text-primary-700"
            title="Add to workspace"
          >
            <Plus className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => onMarkAsRead(article.id)}
            className={`btn btn-ghost btn-sm ${
              article.isRead
                ? 'text-gray-400'
                : 'text-green-600 hover:text-green-700'
            }`}
            disabled={article.isRead}
            title={article.isRead ? 'Already read' : 'Mark as read'}
          >
            <Check className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => onArchive(article.id)}
            className="btn btn-ghost btn-sm text-gray-400 hover:text-gray-600"
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </button>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm text-gray-400 hover:text-gray-600"
          title="Open original article"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export default ArticleCard