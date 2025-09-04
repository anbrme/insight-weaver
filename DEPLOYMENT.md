# Deployment Guide for Insight Weaver

This guide walks you through deploying Insight Weaver to the Cloudflare platform.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install the Cloudflare Workers CLI
   ```bash
   npm install -g wrangler
   ```
3. **Domain**: Optional but recommended for production

## Step-by-Step Deployment

### 1. Authentication

```bash
wrangler auth login
```

### 2. Set Up Database

```bash
# Navigate to workers directory
cd workers

# Create D1 database
wrangler d1 create insight-weaver-db

# Copy the database ID from the output and update wrangler.toml
# database_id = "your-database-id-here"

# Run migrations
wrangler d1 migrations apply insight-weaver-db
```

### 3. Set Up KV Namespace (for caching)

```bash
# Create KV namespace
wrangler kv:namespace create "CACHE"

# Copy the namespace ID and update wrangler.toml
# id = "your-kv-namespace-id"

# Create preview namespace for development
wrangler kv:namespace create "CACHE" --preview

# Copy the preview ID and update wrangler.toml
# preview_id = "your-preview-kv-namespace-id"
```

### 4. Set Up Vectorize Index (for semantic search)

```bash
# Create Vectorize index
wrangler vectorize create insight-weaver-embeddings --dimensions=1024 --metric=cosine

# The index name should match what's in wrangler.toml
# index_name = "insight-weaver-embeddings"
```

### 5. Deploy Workers

```bash
# Deploy the API backend
wrangler deploy

# Test the deployment
curl https://insight-weaver-api.your-subdomain.workers.dev/health
```

### 6. Deploy Frontend (Cloudflare Pages)

#### Option A: Git Integration (Recommended)

1. Push your code to GitHub/GitLab
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
3. Click "Create a project" > "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`

#### Option B: Direct Upload

```bash
# Build the frontend
cd frontend
npm install
npm run build

# Install Wrangler Pages plugin if not already installed
npm install -g @cloudflare/wrangler

# Deploy to Pages
wrangler pages deploy dist --project-name=insight-weaver
```

### 7. Configure Environment Variables

In your Cloudflare Workers dashboard, set any required environment variables:

- `ENVIRONMENT=production`
- Any external API keys if using external AI services

### 8. Update API Endpoints

Update the frontend's API configuration:

1. In `frontend/src/utils/api.ts`, update the `API_BASE_URL` to point to your deployed Workers URL
2. Or set the `VITE_API_BASE_URL` environment variable in your Pages deployment

### 9. Set Up Custom Domain (Optional)

1. In Cloudflare Dashboard > Pages > Your Project > Custom domains
2. Add your domain
3. Update DNS records as instructed

### 10. Configure Scheduled Triggers

The RSS feed fetching is configured to run every 30 minutes via cron triggers in `wrangler.toml`. This will automatically start working once deployed.

## Environment-Specific Configuration

### Development

```bash
# Run frontend locally
cd frontend && npm run dev

# Run workers locally (in another terminal)
cd workers && wrangler dev
```

### Production

- Frontend: Automatically built and deployed via Cloudflare Pages
- Workers: Deployed via `wrangler deploy`
- Database: Cloudflare D1 with automatic backups
- Caching: Cloudflare KV for RSS feed caching
- AI: Cloudflare Workers AI (no additional setup required)

## Monitoring and Maintenance

### Logs

```bash
# View Workers logs
wrangler tail

# View specific deployment logs
wrangler tail --format=pretty
```

### Database Management

```bash
# Access database console
wrangler d1 execute insight-weaver-db --command="SELECT COUNT(*) FROM articles"

# Create new migration
wrangler d1 migrations create insight-weaver-db "add_new_feature"
```

### Updates

```bash
# Update Workers
cd workers && wrangler deploy

# Update frontend (if using Git integration, just push to main branch)
# If using direct upload:
cd frontend && npm run build && wrangler pages deploy dist
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your Workers URL is in the CORS configuration in `workers/src/index.ts`

2. **Database Connection Issues**: Verify your database ID in `wrangler.toml` matches the one created

3. **API Not Found**: Check that your Workers deployment is successful and the URL is correct

4. **RSS Feeds Not Updating**: Check the Workers logs to see if the scheduled triggers are running

### Getting Help

- Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- Check [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- Review application logs using `wrangler tail`

## Security Considerations

1. **API Keys**: Never commit API keys to your repository. Use Cloudflare Workers environment variables.

2. **CORS**: Configure CORS properly for your domain in production.

3. **Rate Limiting**: Consider implementing rate limiting for API endpoints if needed.

4. **Content Security Policy**: Review and update CSP headers in `frontend/_headers`.

## Cost Optimization

- **Workers**: Free tier includes 100,000 requests per day
- **D1**: Free tier includes 5GB storage and 25M row reads per month  
- **Pages**: Free tier includes 500 builds per month
- **Workers AI**: Usage-based pricing for AI inference

Monitor your usage in the Cloudflare Dashboard to stay within free tier limits or upgrade as needed.