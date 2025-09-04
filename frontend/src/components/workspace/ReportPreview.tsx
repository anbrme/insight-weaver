import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { WorkspaceItem, Article } from '../../types'

interface ReportPreviewProps {
  title: string
  items: WorkspaceItem[]
  articles: Article[]
}

const ReportPreview: React.FC<ReportPreviewProps> = ({
  title,
  items,
  articles
}) => {
  const getArticleForItem = (item: WorkspaceItem): Article | undefined => {
    return articles.find(article => article.id === item.articleId)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'Unknown date'
    }
  }

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <div className="card bg-white max-h-96 overflow-y-auto scrollbar-thin">
      {/* Report Header */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-600">
            Generated on {formatDate(new Date().toISOString())} • {items.length} articles
          </p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
          Executive Summary
        </h2>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-3">
            This report presents analysis of {items.length} key developments in geopolitical affairs, 
            drawing from authoritative sources and expert commentary. The analysis covers recent 
            policy statements, diplomatic initiatives, and strategic developments that may impact 
            regional stability and international relations.
          </p>
          <p>
            Key themes include bilateral negotiations, multilateral cooperation frameworks, 
            economic policy implications, and emerging security considerations across multiple regions.
          </p>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-8">
        {sortedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No content added to workspace yet.</p>
          </div>
        ) : (
          sortedItems.map((item, index) => {
            const article = getArticleForItem(item)
            if (!article) return null

            return (
              <div key={item.id} className="border-l-2 border-gray-200 pl-6">
                {/* Section Header */}
                <div className="mb-4">
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <span className="bg-gray-100 px-2 py-1 rounded font-medium mr-2">
                      {index + 1}
                    </span>
                    <span>{article.category}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(article.publishedAt)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {article.title}
                  </h3>
                </div>

                {/* AI Summary */}
                {article.summary && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis:</h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {item.customContent || article.content}
                    </p>
                  </div>
                </div>

                {/* Custom Analysis */}
                {item.customAnalysis && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Expert Assessment:</h4>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-900 leading-relaxed">
                        {item.customAnalysis}
                      </p>
                    </div>
                  </div>
                )}

                {/* Source */}
                <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-gray-100">
                  <span>Source: </span>
                  <a 
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    {new URL(article.url).hostname}
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              This report was generated by Insight Weaver on {formatDate(new Date().toISOString())}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              For questions or additional analysis, please contact the research team.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportPreview