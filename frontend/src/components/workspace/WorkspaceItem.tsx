import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { 
  GripVertical, 
  Sparkles, 
  Edit3, 
  X, 
  ExternalLink, 
  Save, 
  RotateCcw 
} from 'lucide-react'
import { WorkspaceItem as WorkspaceItemType, Article } from '../../types'

interface WorkspaceItemProps {
  item: WorkspaceItemType
  article: Article
  onUpdate: (itemId: string, updates: Partial<WorkspaceItemType>) => void
  onRemove: (itemId: string) => void
  onSummarizeWithAI: (articleId: string) => void
}

const WorkspaceItem: React.FC<WorkspaceItemProps> = ({
  item,
  article,
  onUpdate,
  onRemove,
  onSummarizeWithAI
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.customContent || article.content)
  const [editAnalysis, setEditAnalysis] = useState(item.customAnalysis || '')
  const [activeTab, setActiveTab] = useState<'content' | 'analysis'>('content')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSave = () => {
    onUpdate(item.id, {
      customContent: editContent !== article.content ? editContent : undefined,
      customAnalysis: editAnalysis || undefined,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent(item.customContent || article.content)
    setEditAnalysis(item.customAnalysis || '')
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown date'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card bg-white border-l-4 border-l-primary-500"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <button
            className="mt-1 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
              {article.title}
            </h3>
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <span>{formatDate(article.publishedAt)}</span>
              <span>•</span>
              <span>{article.category}</span>
              {item.isEdited && (
                <>
                  <span>•</span>
                  <span className="text-primary-600 font-medium">Edited</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSummarizeWithAI(article.id)}
            className="btn btn-ghost btn-sm text-purple-600"
            title="Summarize with AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-ghost btn-sm text-blue-600"
            title={isEditing ? 'Cancel editing' : 'Edit content'}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm text-gray-500"
            title="Open original article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => onRemove(item.id)}
            className="btn btn-ghost btn-sm text-red-600"
            title="Remove from workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'content'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'analysis'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Analysis
            </button>
          </div>

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="textarea w-full h-32 text-sm"
                placeholder="Edit article content..."
              />
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div>
              <textarea
                value={editAnalysis}
                onChange={(e) => setEditAnalysis(e.target.value)}
                className="textarea w-full h-32 text-sm"
                placeholder="Add your analysis and insights..."
              />
            </div>
          )}

          {/* Edit Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setEditContent(article.content)
                setEditAnalysis('')
              }}
              className="btn btn-ghost btn-sm text-gray-500"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancel}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* AI Summary */}
          {article.summary && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs font-medium text-purple-800 mb-1 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Summary
              </div>
              <p className="text-sm text-purple-700">{article.summary}</p>
            </div>
          )}

          {/* Content Preview */}
          <div className="text-sm text-gray-700">
            <p className="line-clamp-3">
              {item.customContent || article.snippet}
            </p>
          </div>

          {/* Custom Analysis */}
          {item.customAnalysis && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-800 mb-1">Your Analysis</div>
              <p className="text-sm text-blue-700">{item.customAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkspaceItem