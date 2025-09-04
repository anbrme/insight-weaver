import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  FileText, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus,
  Search,
  Filter,
  Calendar
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Report } from '../types'

// Mock data
const mockReports: Report[] = [
  {
    id: '1',
    title: 'Weekly Geopolitical Analysis - Asia Pacific',
    description: 'Comprehensive analysis of key developments in Asia Pacific region including trade negotiations and security partnerships.',
    items: [],
    status: 'published',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Middle East Policy Brief',
    description: 'Analysis of recent diplomatic initiatives and their implications for regional stability.',
    items: [],
    status: 'draft',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'US-Europe Relations Update',
    description: 'Latest developments in transatlantic cooperation on economic and security matters.',
    items: [],
    status: 'published',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
]

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'title'>('updated')

  useEffect(() => {
    // Load reports
    const loadData = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setReports(mockReports)
      setLoading(false)
    }

    loadData()
  }, [])

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      setReports(prev => prev.filter(report => report.id !== reportId))
    }
  }

  const handleDuplicateReport = (report: Report) => {
    const newReport: Report = {
      ...report,
      id: Date.now().toString(),
      title: `${report.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setReports(prev => [newReport, ...prev])
  }

  const handleExportReport = (reportId: string, format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting report ${reportId} as ${format}`)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown date'
    }
  }

  // Filter and sort reports
  const filteredReports = React.useMemo(() => {
    let filtered = reports

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    return filtered
  }, [reports, searchTerm, statusFilter, sortBy])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-header">Reports</h1>
          <p className="text-gray-600">Manage and export your geopolitical analysis reports</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input w-32"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input w-36"
          >
            <option value="updated">Last Updated</option>
            <option value="created">Created Date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {reports.length === 0 ? 'No reports yet' : 'No reports match your filters'}
          </h3>
          <p className="text-gray-500 mb-4">
            {reports.length === 0 
              ? 'Create your first report by adding articles to the workspace.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {reports.length === 0 && (
            <button className="btn btn-primary">
              Go to Workspace
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="card card-hover">
              {/* Report Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {report.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      report.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {report.items.length} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {report.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {report.description}
                </p>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-500 mb-4">
                <div className="flex items-center mb-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created {formatDate(report.createdAt)}
                </div>
                <div>Updated {formatDate(report.updatedAt)}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => console.log('View report:', report.id)}
                    className="btn btn-ghost btn-sm text-blue-600"
                    title="View report"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => console.log('Edit report:', report.id)}
                    className="btn btn-ghost btn-sm text-gray-600"
                    title="Edit report"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="btn btn-ghost btn-sm text-red-600"
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Export dropdown */}
                <div className="relative group">
                  <button className="btn btn-ghost btn-sm text-gray-600">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleExportReport(report.id, 'html')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        HTML
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, 'pdf')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, 'markdown')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, 'json')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reports