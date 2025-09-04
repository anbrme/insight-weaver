import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Save, X, TestTube } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { RSSFeed, AISettings, AppSettings } from '../types'

// Mock data
const mockSettings: AppSettings = {
  ai: {
    provider: 'cloudflare',
    systemPrompt: 'You are a factual, neutral geopolitical analyst. Your task is to summarize the following article. Extract only the key facts, policy statements, and strategic arguments. Avoid speculative language and journalistic flair. Present the summary as a series of bullet points. The summary must be concise and no more than 150 words.',
    maxTokens: 150,
    temperature: 0.3,
  },
  refreshInterval: 30,
  maxArticlesPerFeed: 50,
}

const mockFeeds: RSSFeed[] = [
  {
    id: '1',
    name: 'Council on Foreign Relations',
    url: 'https://www.cfr.org/rss/feeds/analysis',
    category: 'Think Tanks',
    isActive: true,
    lastFetched: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'US State Department',
    url: 'https://www.state.gov/rss/',
    category: 'Official Statements',
    isActive: true,
    lastFetched: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const Settings: React.FC = () => {
  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [settings, setSettings] = useState<AppSettings>(mockSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState<Partial<RSSFeed>>({
    name: '',
    url: '',
    category: '',
    isActive: true,
  })
  const [testingAI, setTestingAI] = useState(false)

  useEffect(() => {
    // Load settings
    const loadData = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setFeeds(mockFeeds)
      setLoading(false)
    }

    loadData()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    // TODO: Implement actual save
    console.log('Settings saved:', settings)
  }

  const handleAddFeed = async () => {
    if (!newFeed.name || !newFeed.url) return

    const feed: RSSFeed = {
      id: Date.now().toString(),
      name: newFeed.name,
      url: newFeed.url,
      category: newFeed.category || 'Uncategorized',
      isActive: newFeed.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setFeeds(prev => [...prev, feed])
    setNewFeed({ name: '', url: '', category: '', isActive: true })
    setShowAddFeed(false)
  }

  const handleUpdateFeed = (feedId: string, updates: Partial<RSSFeed>) => {
    setFeeds(prev =>
      prev.map(feed =>
        feed.id === feedId
          ? { ...feed, ...updates, updatedAt: new Date().toISOString() }
          : feed
      )
    )
  }

  const handleDeleteFeed = (feedId: string) => {
    setFeeds(prev => prev.filter(feed => feed.id !== feedId))
  }

  const handleTestAI = async () => {
    setTestingAI(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setTestingAI(false)
    // TODO: Implement actual AI test
    alert('AI connection test successful!')
  }

  const categories = Array.from(new Set(feeds.map(feed => feed.category)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* RSS Feeds Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-header">RSS Feed Management</h2>
          <button
            onClick={() => setShowAddFeed(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Feed
          </button>
        </div>

        {/* Add Feed Form */}
        {showAddFeed && (
          <div className="card bg-gray-50 border-dashed">
            <h3 className="font-medium text-gray-900 mb-4">Add New RSS Feed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Feed Name</label>
                <input
                  type="text"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="e.g., Council on Foreign Relations"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  type="text"
                  value={newFeed.category}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                  placeholder="e.g., Think Tanks"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="label">RSS URL</label>
              <input
                type="url"
                value={newFeed.url}
                onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                className="input"
                placeholder="https://example.com/rss"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newFeed.isActive}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowAddFeed(false)
                    setNewFeed({ name: '', url: '', category: '', isActive: true })
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFeed}
                  className="btn btn-primary btn-sm"
                >
                  Add Feed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feeds List */}
        <div className="space-y-3">
          {feeds.map((feed) => (
            <div key={feed.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={feed.isActive}
                      onChange={(e) => handleUpdateFeed(feed.id, { isActive: e.target.checked })}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{feed.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="truncate">{feed.url}</span>
                        <span>•</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {feed.category}
                        </span>
                        {feed.lastFetched && (
                          <>
                            <span>•</span>
                            <span>Last: {new Date(feed.lastFetched).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingFeed(feed)}
                    className="btn btn-ghost btn-sm text-blue-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="btn btn-ghost btn-sm text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Settings Section */}
      <div className="space-y-6">
        <h2 className="section-header">AI Configuration</h2>
        
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">AI Provider</label>
              <select
                value={settings.ai.provider}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ai: { ...prev.ai, provider: e.target.value as 'cloudflare' | 'external' }
                }))}
                className="input"
              >
                <option value="cloudflare">Cloudflare Workers AI</option>
                <option value="external">External API</option>
              </select>
            </div>

            {settings.ai.provider === 'external' && (
              <div>
                <label className="label">API Key</label>
                <input
                  type="password"
                  value={settings.ai.apiKey || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ai: { ...prev.ai, apiKey: e.target.value }
                  }))}
                  className="input"
                  placeholder="Enter your API key"
                />
              </div>
            )}

            <div>
              <label className="label">Max Tokens</label>
              <input
                type="number"
                value={settings.ai.maxTokens}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ai: { ...prev.ai, maxTokens: parseInt(e.target.value) }
                }))}
                className="input"
                min="50"
                max="500"
              />
            </div>

            <div>
              <label className="label">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={settings.ai.temperature}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ai: { ...prev.ai, temperature: parseFloat(e.target.value) }
                }))}
                className="input"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="label">System Prompt</label>
            <textarea
              value={settings.ai.systemPrompt}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                ai: { ...prev.ai, systemPrompt: e.target.value }
              }))}
              className="textarea h-32"
              placeholder="Enter the system prompt for AI summarization..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleTestAI}
              disabled={testingAI}
              className="btn btn-secondary btn-sm"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testingAI ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="space-y-6">
        <h2 className="section-header">General Settings</h2>
        
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Refresh Interval (minutes)</label>
              <input
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  refreshInterval: parseInt(e.target.value)
                }))}
                className="input"
                min="5"
                max="1440"
              />
            </div>

            <div>
              <label className="label">Max Articles per Feed</label>
              <input
                type="number"
                value={settings.maxArticlesPerFeed}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  maxArticlesPerFeed: parseInt(e.target.value)
                }))}
                className="input"
                min="10"
                max="200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default Settings