# Insight Weaver

A serverless geopolitical analysis and publishing tool built on the Cloudflare stack.

## Overview

Insight Weaver streamlines the process of geopolitical analysis by aggregating information from RSS feeds, enabling expert curation and editing, integrating AI for summarization, and generating polished reports.

## Architecture

- **Frontend**: React with Vite and Tailwind CSS (deployed on Cloudflare Pages)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQL)
- **Vector Search**: Cloudflare Vectorize
- **AI**: Cloudflare Workers AI

## Project Structure

```
insight-weaver/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/     # The Ticker components
│   │   │   ├── workspace/     # The Canvas components  
│   │   │   ├── settings/      # Feed management UI
│   │   │   └── common/        # Shared components
│   │   ├── pages/            # Main pages
│   │   ├── hooks/            # React hooks
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript types
│   └── public/               # Static assets
├── workers/           # Cloudflare Workers
│   ├── src/          # Worker source code
│   └── schema/       # Database schemas
└── docs/             # Documentation
```

## Features

### Core Workflow
1. **Feed Management** - Add and categorize RSS feeds
2. **Content Ingestion** - Dashboard view of incoming articles
3. **Curation Workspace** - Drag-and-drop interface for report building
4. **AI Analysis** - Summarization and analysis using Cloudflare Workers AI
5. **Report Generation** - Export to HTML, PDF, Markdown, and JSON formats

### Key Components
- **The Source Hub**: RSS feed management and categorization
- **The Ticker**: Multi-column dashboard for incoming articles
- **The Canvas**: Drag-and-drop curation workspace
- **The Analyst AI**: AI-powered summarization and analysis
- **The Publisher**: Report generation and export functionality

## Getting Started

1. Install dependencies:
   ```bash
   npm run setup
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

## Configuration

The application requires Cloudflare account setup with:
- Cloudflare Pages (for frontend)
- Cloudflare Workers (for backend)
- Cloudflare D1 (for database)
- Cloudflare Vectorize (for semantic search)
- Cloudflare Workers AI (for summarization)

## License

MIT License - see LICENSE file for details