import React, { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FileText, Download, Sparkles, Save, Eye } from 'lucide-react'
import WorkspaceItem from '../components/workspace/WorkspaceItem'
import ReportPreview from '../components/workspace/ReportPreview'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { WorkspaceItem as WorkspaceItemType, Article, Report } from '../types'

// Mock data
const mockWorkspaceItems: WorkspaceItemType[] = [
  {
    id: '1',
    articleId: '1',
    order: 0,
    isEdited: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    articleId: '2',
    order: 1,
    customContent: 'This is custom analysis added by the user for this article.',
    isEdited: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

const mockArticles: Article[] = [
  {
    id: '1',
    feedId: '1',
    title: 'US-China Trade Relations: Current Tensions and Future Prospects',
    content: 'Recent developments in US-China trade negotiations suggest a significant shift in diplomatic approach. The latest round of talks, held in Geneva, highlighted key areas of disagreement while also revealing potential pathways for cooperation. Trade officials from both nations emphasized the importance of maintaining economic stability despite political tensions.',
    snippet: 'Recent developments in US-China trade negotiations suggest a shift in diplomatic approach...',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.com/article1',
    isRead: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Think Tanks',
    summary: 'Trade talks reveal both disagreements and cooperation opportunities. Officials stress economic stability despite tensions. Geneva meeting highlights key negotiation points.',
  },
  {
    id: '2',
    feedId: '2',
    title: 'Secretary Blinken Statement on Middle East Policy',
    content: 'The Department of State announces comprehensive diplomatic initiatives aimed at promoting regional stability in the Middle East. Secretary Blinken outlined a multi-faceted approach that includes humanitarian aid, economic partnerships, and security cooperation with regional allies.',
    snippet: 'The Department of State announces new diplomatic initiatives for regional stability...',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.com/article2',
    isRead: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Official Statements',
    summary: 'State Department launches comprehensive Middle East diplomatic initiative. Focus on humanitarian aid, economic partnerships, and regional security cooperation.',
  }
]

const Workspace: React.FC = () => {
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItemType[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reportTitle, setReportTitle] = useState('Weekly Geopolitical Analysis')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    // Load workspace data
    const loadData = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setWorkspaceItems(mockWorkspaceItems)
      setArticles(mockArticles)
      setLoading(false)
    }

    loadData()
  }, [])

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setWorkspaceItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Update order values
        return newItems.map((item, index) => ({
          ...item,
          order: index,
          updatedAt: new Date().toISOString()
        }))
      })
    }
  }

  const handleUpdateItem = (itemId: string, updates: Partial<WorkspaceItemType>) => {
    setWorkspaceItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              isEdited: true,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    )
  }

  const handleRemoveItem = (itemId: string) => {
    setWorkspaceItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleSummarizeWithAI = async (articleId: string) => {
    // TODO: Implement AI summarization
    console.log('Summarizing article with AI:', articleId)
  }

  const handleSaveReport = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    
    // TODO: Implement actual save functionality
    console.log('Report saved')
  }

  const handleExportReport = (format: string) => {
    // TODO: Implement export functionality
    console.log('Exporting report as:', format)
  }

  const getArticleForItem = (item: WorkspaceItemType): Article | undefined => {
    return articles.find(article => article.id === item.articleId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 w-full"
            placeholder="Report title..."
          />
          <p className="text-sm text-gray-500 mt-1">
            {workspaceItems.length} items • Last saved: {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveReport}
            disabled={saving}
            className="btn btn-ghost btn-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary btn-sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>

          <div className="relative group">
            <button className="btn btn-primary btn-sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExportReport('html')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  HTML Report
                </button>
                <button
                  onClick={() => handleExportReport('pdf')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  PDF Document
                </button>
                <button
                  onClick={() => handleExportReport('markdown')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Markdown
                </button>
                <button
                  onClick={() => handleExportReport('json')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  JSON Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Canvas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Workspace Canvas</h2>
            <div className="text-sm text-gray-500">
              Drag to reorder items
            </div>
          </div>

          {workspaceItems.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Workspace</h3>
              <p className="text-gray-500 mb-4">
                Add articles from the dashboard to start building your report.
              </p>
              <button className="btn btn-primary">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={workspaceItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {workspaceItems.map((item) => {
                    const article = getArticleForItem(item)
                    return article ? (
                      <WorkspaceItem
                        key={item.id}
                        item={item}
                        article={article}
                        onUpdate={handleUpdateItem}
                        onRemove={handleRemoveItem}
                        onSummarizeWithAI={handleSummarizeWithAI}
                      />
                    ) : null
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="space-y-4">
            <h2 className="section-header">Report Preview</h2>
            <ReportPreview
              title={reportTitle}
              items={workspaceItems}
              articles={articles}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Workspace