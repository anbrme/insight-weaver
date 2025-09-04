import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Env } from './types'
import { feedsRouter } from './routes/feeds'
import { articlesRouter } from './routes/articles'
import { workspaceRouter } from './routes/workspace'
import { reportsRouter } from './routes/reports'
import { settingsRouter } from './routes/settings'
import { scheduledFeedFetch } from './services/feedFetcher'

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:3000', 'https://insight-weaver.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Insight Weaver API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  })
})

app.get('/health', async (c) => {
  try {
    // Test database connection
    const result = await c.env.DB.prepare('SELECT 1 as test').first()
    
    return c.json({
      status: 'healthy',
      database: result ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// API routes
app.route('/api/feeds', feedsRouter)
app.route('/api/articles', articlesRouter)
app.route('/api/workspace', workspaceRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/settings', settingsRouter)

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  }, 404)
})

// Error handler
app.onError((error, c) => {
  console.error('API Error:', error)
  
  return c.json({
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred'
  }, 500)
})

// Scheduled event handler for RSS feed fetching
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('Running scheduled RSS feed fetch')
  ctx.waitUntil(scheduledFeedFetch(env))
}

export default {
  fetch: app.fetch,
  scheduled
}